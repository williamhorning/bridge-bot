export async function getGuildedMember({ serverId, message: { createdBy } }) {
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

export async function sendGuildedMessageEmbed(
  channelIdGuilded,
  { author: { id, username, avatar }, cleanContent, attachments }
) {
  let attachmentUrls = '';
  let fields;
  if (attachments) {
    attachments.map(({ url }) => {
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

  return await (
    await fetch(
      `https://www.guilded.gg/api/v1/channels/${channelIdGuilded}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          isSilent: true,
          embeds: [
            {
              author: {
                name: username,
                icon_url: `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=80`,
              },
              description: cleanContent,
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
    )
  ).text();
}

export async function sendGuildedMessage(channelIdGuilded, content) {
  await (
    await fetch(
      `https://www.guilded.gg/api/v1/channels/${channelIdGuilded}/messages`,
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
