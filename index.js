import 'dotenv/config';

import WebSocket from 'ws';

import Discord from 'discord.js';

import {
  getGuildedMember,
  sendGuildedMessage,
  sendGuildedMessageEmbed,
} from './fetch.js';

const client = new Discord.Client({
  intents: Object.values(Discord.Intents.FLAGS),
});

const socket = new WebSocket('wss://api.guilded.gg/v1/websocket', {
  headers: {
    Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
  },
});

import { KVNamespace } from '@miniflare/kv';
import { FileStorage } from '@miniflare/storage-file';

const discordChannel = new KVNamespace(new FileStorage("./discordChannel"));

const guildedChannel = new KVNamespace(new FileStorage("./guildedChannel"));

client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
  console.log('logged into discord');
});

socket.on('open', function () {
  console.log('logged into guilded');
});

client.on('message', async (message) => {
  if (message.author.bot) {
    return;
  } else if (message.content.startsWith('!guilded')) {
    const commands = message.content.split(' ');
    if (commands[1] == 'join') {
      discordChannel.put(commands[2], message.channelId);
      guildedChannel.put(message.channelId, commands[2]);
      message.reply('joined guilded channel');
    }
  } else {
    var channelIdGuilded = await guildedChannel.get(message.channel.id);
    if (channelIdGuilded) {
      await sendGuildedMessageEmbed(channelIdGuilded, message);
    } else {
      return;
    }
  }
});

socket.on('message', async function incoming(data) {
  const { t, d } = JSON.parse(data);
  if (t === 'ChatMessageCreated') {
    const channelIdDiscord = await discordChannel.get(d.message.channelId);
    if (d.message.content.startsWith('!discord')) {
      const commands = d.message.content.split(' ');
      if (commands[1] == 'join') {
        discordChannel.put(d.message.channelId, commands[2]);
        guildedChannel.put(commands[2], d.message.channelId);
        sendGuildedMessage(d.message.channelId, 'joined discord channel');
      }
    } else if (channelIdDiscord) {
      if (d.message.createdBy == '4vEv8eEA') return;
      try {
        let attachmentUrls = '';
        let fields =[];
        d.message.content.match(/\n?!\[\]\((.*)\)\n?/gm)?.map((item) => {
          let matchd = item.match(/\((.*)\)/gm)[0]
          attachmentUrls = `${attachmentUrls}\n${matchd.substring(1, matchd.length-1)}`;
          if (attachmentUrls) {
            fields = [
              {
                name: 'Attachments',
                value: attachmentUrls,
              },
            ];
          }
        });
        let member = await getGuildedMember(d);
        client.channels.cache.get(channelIdDiscord).send({
          embeds: [
            new Discord.MessageEmbed()
              .setAuthor({
                name: member.user.name,
                iconURL: member.user.avatar,
              })
              .setDescription(
                d.message.content.replace(/\n?!\[\]\((.*)\)\n?/gm, '')
              ).setFields(fields)
          ],
        });
      } catch (e) {
        console.log(`guilded to discord error: ${e.message}`);
      }
    } else {
      return;
    }
  } else {
    return;
  }
});
