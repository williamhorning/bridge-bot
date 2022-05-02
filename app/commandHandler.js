export default async (kv, send, channelid, type, message) => {
  let commands = message.split(' ');
  commands.shift();
  let command = commands[0];
  commands.shift();
  let args = commands.join(' ');
  if (command == 'join') {
    if (!args) {
      await send('Please provide a bridge ID');
    } else {
      await kv.put(`${type}-${String(args)}`, channelid);
      await kv.put(`${type}-${channelid}`, String(args));
      await send(`Joined bridge ID ${args}`);
    }
  } else if (command == 'leave') {
    if (!args) {
      await send('Please provide a bridge ID');
    } else {
      await kv.delete(`${type}-${String(args)}`);
      await kv.delete(`${type}-${channelid}`);
      await send(`Left bridge ID ${args}`);
    }
  } else {
    await send(
      'Bridge help: \n > !bridge join <bridgeID> - Join a bridge \n > !bridge leave <bridgeID> - Leave a bridge'
    );
  }
};
