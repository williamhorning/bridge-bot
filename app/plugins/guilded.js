// this module is used to bridge guilded to other chat services

import WebSocket from 'ws'; // used for websocket connection to Guilded

import EventEmitter from 'events';

async function sendGuildedMessage(channelid, content) {
  await (
    await fetch(
      `https://www.guilded.gg/api/v1/channels/${channelid}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          isSilent: true,
          content,
        }),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )
  ).text();
}

async function getGuildedMember({ serverId, message: { createdBy } }) {
  return (
    await (
      await fetch(
        `https://www.guilded.gg/api/v1/servers/${serverId}/members/${createdBy}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )
    ).json()
  )['member'];
}

export default class GuildedBridge extends EventEmitter {
  constructor() {
    super();
  }
  async setup(kv) {
    this.kv = kv;

    this.socket = new WebSocket('wss://api.guilded.gg/v1/websocket', {
      headers: {
        Authorization: `Bearer ${process.env.GUILDED_TOKEN}`, // Guilded token to get all message events
      },
    });

    this.socket.on('message', async (data)=>{
      try {
        const { t, d } = JSON.parse(data.toString());
        if (t == 'ChatMessageCreated') {
          const bridgeID = await kv.get(`guilded-${d.message.channelId}`);
          if (d.message.content.startsWith('!bridge')) {
            let commands = d.message.content.split(' ');
            commands.shift();
            let command = commands[0];
            let args = commands.join(' ');
            if (command == 'join') {
              if (!args) {
                await sendGuildedMessage(d.message.channelId, 'Please provide a bridge ID');
              } else {
                await kv.put(`guilded-${String(args)}`, d.message.channelId);
                await kv.put(`guilded-${d.message.channelId}`, String(args));
                await sendGuildedMessage(d.message.channelId, `Joined bridge ID ${args}`);
              }
            } else if (command == 'leave') {
              if (!args) {
                await sendGuildedMessage(d.message.channelId, 'Please provide a bridge ID');
              } else {
                await kv.delete(`guilded-${String(args)}`);
                await kv.delete(`guilded-${d.message.channelId}`);
                await sendGuildedMessage(d.message.channelId, `Left bridge ID ${args}`);
              }
            } else {
              await sendGuildedMessage(d.message.channelId,
                'Bridge help: \n > !bridge join <bridgeID> - Join a bridge \n > !bridge leave <bridgeID> - Leave a bridge'
              );
            }
          } else if (bridgeID) {
            if (d.message.createdBy == process.env.GUILDED_ID) return;
            try {
              let attachmentUrls = '';
              let fields = [];
              d.message.content.match(/\n?!\[\]\((.*)\)\n?/gm)?.map((item) => {
                let matchd = item.match(/\((.*)\)/gm)[0];
                attachmentUrls = `${attachmentUrls}\n${matchd.substring(
                  1,
                  matchd.length - 1
                )}`;
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
              return this.emit(
                'message',
                bridgeID,
                member.user.name,
                member.user.avatar,
                d.message.content.replace(/\n?!\[\]\((.*)\)\n?/gm, ''),
                fields
              );
            } catch (e) {
              console.log('error', e);
            }
          } else {
            return;
          }
        } else {
          return;
        }
      } catch (e) {}
    });
  }

  async send(bridgeID, name, icon_url, description, fields) {
    let channelid = await this.kv.get(`guilded-${bridgeID}`);
    if (channelid) {
      await fetch(
        `https://www.guilded.gg/api/v1/channels/${channelid}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            isSilent: true,
            embeds: [
              {
                author: {
                  name,
                  icon_url,
                },
                description,
                fields,
              },
            ],
          }),
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${process.env.GUILDED_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }
}
