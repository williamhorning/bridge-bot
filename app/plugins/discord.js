// this module is used to bridge discord to other chat services

import Discord from 'discord.js'; // used for connection to Discord

import EventEmitter from 'events';

async function commandHandler(message, kv) {
  let type = 'discord';
  let commands = message.content.split(' ');
  commands.shift();
  let command = commands[0];
  commands.shift();
  let args = commands.join(' ');
  if (command == 'join') {
    if (!args) {
      message.reply('Please provide a bridge ID');
    } else {
      let webhook = await message.channel.createWebhook('bridge');
      console.log(webhook);
      await kv.put(
        `${type}-${String(args)}`,
        JSON.stringify({ id: webhook.id, token: webhook.token })
      );
      await kv.put(`${type}-${message.channel.id}`, String(args));
      message.reply(`Joined bridge ID ${args}`);
    }
  } else if (command == 'leave') {
    if (!args) {
      message.reply('Please provide a bridge ID');
    } else {
      await kv.delete(`${type}-${String(args)}`);
      await kv.delete(`${type}-${message.channel.id}`);
      message.reply(`Left bridge ID ${args}`);
    }
  } else {
    message.reply(
      'Bridge help: \n > !bridge join <bridgeID> - Join a bridge \n > !bridge leave <bridgeID> - Leave a bridge'
    );
  }
}

export default class DiscordBridge extends EventEmitter {
  constructor() {
    super();
  }
  async setup(kv) {
    this.kv = kv;

    this.client = new Discord.Client({
      intents: Object.values(Discord.Intents.FLAGS), // enable all intents
    });

    this.client.login(process.env.DISCORD_TOKEN);

    this.client.on('message', async (message) => {
      const bridgeID = await kv.get(`discord-${message.channelId}`);
      if (message.webhookId || message.author.id == process.env.DISCORD_ID) {
        return;
      } else if (message.content.startsWith('!bridge')) {
        await commandHandler(message, kv);
      } else {
        if (bridgeID) {
          let attachmentUrls = '';
          let fields = [];
          if (message.attachments) {
            message.attachments.map(({ url }) => {
              attachmentUrls = `${attachmentUrls}\n${url}`;
            });
            if (attachmentUrls) {
              fields = [
                {
                  name: 'Attachments',
                  value: attachmentUrls,
                },
              ];
            }
          }
          if (message.reference) {
            fields = [
              ...fields,
              {
                name: 'In reply to:',
                value: (
                  await message.channel.messages.fetch(
                    message.reference.messageId
                  )
                ).content,
              },
            ];
          }
          if ((await message.channel.fetchWebhooks()).size < 1) {
            if (
              (await kv.get(`discord-${message.channelId}-webhooknotice`)) ==
              undefined
            ) {
              message.reply(
                'Your message might not have been sent or you are using a webhookless bridge. Run `!bridge join` again to set up a webhook-based bridge.'
              );
              await kv.put(
                `discord-${message.channelId}-webhooknotice`,
                '1'
              );
            }
          }
          return this.emit(
            'message',
            bridgeID,
            message.author.username,
            `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.webp?size=80`,
            message.cleanContent,
            fields
          );
        } else {
          return;
        }
      }
    });
  }

  async send(bridgeID, username, avatarURL, content, fields) {
    let webhookUrl = await this.kv.get(`discord-${bridgeID}`);
    if (webhookUrl) {
      if (isNaN(webhookUrl)) {
        let webhook = JSON.parse(webhookUrl);
        let webhookClient = new Discord.WebhookClient({
          id: webhook.id,
          token: webhook.token,
        });
        var files = fields[0]?.value.split('\n');
        files?.shift();
        if (!content) content = '​';
        webhookClient.send({
          content,
          username,
          avatarURL,
          files,
        });
      } else {
        this.client.channels.cache.get(webhookUrl).send({
          embeds: [
            new Discord.MessageEmbed()
              .setAuthor({
                name: username,
                iconURL: avatarURL,
              })
              .setDescription(content)
              .setFields(fields)
              .setFooter('You are using a webhookless bridge. Run `!bridge join` again to set up a webhook-based bridge.'),
          ],
        });
      }
    }
  }
}
