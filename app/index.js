import { config } from 'dotenv'; // in the .env file, set the variables GUILDED_TOKEN, GUILDED_ID, DISCORD_TOKEN, and DISCORD_ID
import { KVNamespace } from '@miniflare/kv'; // used for KV storage
import { FileStorage } from '@miniflare/storage-file'; // used to persist data
import DiscordBridge from './plugins/discord.js';
import GuildedBridge from './plugins/guilded.js';
import RevoltBridge from './plugins/revolt.js';

config({ path: '../.env' });

const kv = new KVNamespace(new FileStorage('../kv')); // Guilded ID is key

const Discord = new DiscordBridge();
const Guilded = new GuildedBridge();
const Revolt = new RevoltBridge();

Discord.setup(kv);
Guilded.setup(kv);
Revolt.setup(kv);

Discord.on('message', (...args) => {
  Guilded.send(...args);
  Revolt.send(...args);
});

Guilded.on('message', (...args) => {
  Discord.send(...args);
  Revolt.send(...args);
});

Revolt.on('message', (...args) => {
  Discord.send(...args);
  Guilded.send(...args);
})