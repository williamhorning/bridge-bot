// this module is used to bridge discord to other chat services

import Discord from 'discord.js'; // used for connection to Discord

import EventEmitter from 'events';

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
      if (message.author.id == process.env.DISCORD_ID) {
        return;
      } else if (message.content.startsWith('!bridge')) {
        const commands = message.content.split(' ');
        if (commands[1] == 'join') {
          kv.put(`discord-${commands[2]}`, message.channelId);
          kv.put(`discord-${message.channelId}`, commands[2]);
          message.reply(`Joined bridge ${commands[2]}`);
        }
      } else {
        if (bridgeID) {
          let attachmentUrls = '';
          let fields;
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
            } else {
              fields = [];
            }
          }
          this.emit(
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

  async send(bridgeID, name, iconURL, description, fields) {
    let channelid = await this.kv.get(`discord-${bridgeID}`);
    if (channelid) {
      console.log(this)
      this.client.channels.cache.get(channelid).send({
        embeds: [
          new Discord.MessageEmbed()
            .setAuthor({
              name,
              iconURL,
            })
            .setDescription(description)
            .setFields(fields),
        ],
      });
    }
  }
}
