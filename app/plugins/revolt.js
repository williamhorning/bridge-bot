// this module is used to bridge revolt to other chat services

import Revolt from 'revolt.js'; // used for connection to revolt

import EventEmitter from 'events';

import commandHandler from '../commandHandler.js';

import { MessageEmbed } from 'discord.js';

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
        return await commandHandler(
          kv,
          (str) => {
            message.channel.sendMessage(str);
          },
          message.channel_id,
          'revolt',
          message.content
        );
      } else if (bridgeID) {
        console.log(message);
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
        console.log('emit')
        return this.emit(
          'message',
          bridgeID,
          message.author.username,
          message.author.avatarURL,
          message.content,
          fields
        );
      } else {
        return;
      }
    });
  }

// TODO: fix this

  async send(bridgeID, name, iconURL, description, fields) {
    let channelid = await this.kv.get(`revolt-${bridgeID}`);
    if (channelid) {
      let str = '';
      if (fields[0]) str = `\n**${fields[0].name}**\n${fields[0].value}`;
      if (fields[1]) str = `${str}\n**${fields[0].name}**\n${fields[0].value}`;
      console.log(
        await (
          await fetch(
            `https://api.revolt.chat/channels/${channelid}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer: process.env.REVOLT_TOKEN`,
                Accept: 'application/json',
              },
              body: JSON.stringify({
                content: ' ',
                embeds: [
                  new MessageEmbed()
                    .setAuthor({
                      name,
                      iconURL,
                    })
                    .setDescription(description + str),
                ],
              }),
            }
          )
        ).json()
      );
    }
  }
}
