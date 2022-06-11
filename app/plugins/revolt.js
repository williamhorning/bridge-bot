// this module is used to bridge revolt to other chat services

import Revolt from 'revolt.js'; // used for connection to revolt

import EventEmitter from 'events';

export default class RevoltBridge extends EventEmitter {
  constructor() {
    super();
  }
  async setup(kv) {
    this.kv = kv;

    this.client = new Revolt.Client();

    this.client.loginBot(process.env.REVOLT_TOKEN);

    this.client.on('message', async (message) => {
      const bridgeID = await kv.get(`revolt-${message.channel_id}`);
      if (message.author_id == process.env.REVOLT_ID) {
        return;
      } else if (typeof message.content !== 'string') {
        return;
      } else if (message.content.startsWith('!bridge')) {
        let commands = message.content.split(' ');
        commands.shift();
        let command = commands[0];
        let args = commands.join(' ');
        if (command == 'join') {
          if (!args) {
            message.channel.sendMessage('Please provide a bridge ID');
          } else {
            await kv.put(`revolt-${String(args)}`, message.channel_id);
            await kv.put(`revolt-${message.channel_id}`, String(args));
            message.channel.sendMessage(`Joined bridge ID ${args}`);
          }
        } else if (command == 'leave') {
          if (!args) {
            message.channel.sendMessage('Please provide a bridge ID');
          } else {
            await kv.delete(`revolt-${String(args)}`);
            await kv.delete(`revolt-${message.channel_id}`);
            message.channel.sendMessage(`Left bridge ID ${args}`);
          }
        } else {
          message.channel.sendMessage(
            'Bridge help: \n > !bridge join <bridgeID> - Join a bridge \n > !bridge leave <bridgeID> - Leave a bridge'
          );
        }
      } else if (bridgeID) {
        let attachmentUrls = '';
        let fields = [];
        console.log(message.attachments)
        if (message.attachments) {
          message.attachments.map(({ url }) => { // FIXME: this should actually work
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
        return this.emit(
          'message',
          bridgeID,
          message.author.username,
          message.author.defaultAvatarURL, // FIXME: this should use the actual avatar, not the default, smh revolt.js is a pain in the ass
          message.content,
          fields
        );
      } else {
        return;
      }
    });
  }

  // TODO: fix this

  async send(bridgeID, name, avatar, description, fields) {
    let channelid = await this.kv.get(`revolt-${bridgeID}`);
    if (channelid) {
      let str = '';
      if (fields[0]) str = `\n**${fields[0].name}**\n${fields[0].value}`;
      if (fields[1]) str = `${str}\n**${fields[0].name}**\n${fields[0].value}`;
      try {
      (await (await this.client.channels.fetch(channelid)).sendMessage({
        content: description + str,
        masquerade: {
          name,
          avatar
        },
      }));
      } catch (e) {
        console.log(e);
      }
    }
  }
}

