import 'dotenv/config';

import WebSocket from 'ws';

import Discord from 'discord.js';

const client = new Discord.Client();

const socket = new WebSocket('wss://api.guilded.gg/v1/websocket', {
  headers: {
    Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
  },
});

import { KVNamespace } from '@miniflare/kv';
import { MemoryStorage } from '@miniflare/storage-memory';

const discordChannel = new KVNamespace(new MemoryStorage());

const guildedChannel = new KVNamespace(new MemoryStorage());

client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
  console.log('logged into discord');
});

socket.on('open', function () {
  console.log('logged into guilded');
});

client.on('message', async (message) => {
  if(message.author.bot) {
    return;
  } else if (message.channel.type == 'text') {
    var channelIdGuilded = await guildedChannel.get(message.channel.id);
    // console.log(channelIdGuilded);
    if (channelIdGuilded) {
      console.log(
        await fetch(
          `https://guilded.gg/api/v1/channels/${channelIdGuilded}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              isSilent: true,
              embeds: [
                {
                  content: 'a',
                  author: {
                    name: message.author.username,
                    icon_url: message.author.avatarURL,
                  },
                  description: message.cleanContent,
                },
              ],
            }),
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );
    } else {
      return;
    }
  } else if (message.channel.type == 'dm') {
    var channelIDs = message.cleanContent.split('||');
    discordChannel.put(channelIDs[0], channelIDs[1]);
    guildedChannel.put(channelIDs[1], channelIDs[0]);
  } else {
    return;
  }
});

socket.on('message', async function incoming(data) {
  const { t, d } = JSON.parse(data);
  if (t === 'ChatMessageCreated') {
    const channelIdDiscord = await discordChannel.get(d.message.channelId);
    if (channelIdDiscord) {
      try {
        let member = await (
          await fetch(
            `https://guilded.gg/api/v1/servers/${d.serverId}/members/${d.message.createdBy}`,
            {
              headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          )
        ).json();
        client.channels.cache.get(channelIdDiscord).send({
          embed: {
            description: d.message.content,
            author: {
              name: member.member.user.name,
            },
          },
        });
      } catch (e) {
        console.log(e);
      }
    } else {
      return;
    }
  } else {
    return;
  }
});
