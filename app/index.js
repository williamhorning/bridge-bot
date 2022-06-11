import { config } from 'dotenv';
import { KVNamespace } from '@miniflare/kv';
import { FileStorage } from '@miniflare/storage-file';
import DiscordBridge from './plugins/discord.js';
import GuildedBridge from './plugins/guilded.js';
import RevoltBridge from './plugins/revolt.js';

config({ path: '../.env' });

const kv = new KVNamespace(new FileStorage('../kv'));

const Discord = new DiscordBridge();
const Guilded = new GuildedBridge();
// const Revolt = new RevoltBridge();

Discord.setup(kv);
Guilded.setup(kv);
// Revolt.setup(kv);

Discord.on('message', (...args) => {
  Guilded.send(...args);
  // Revolt.send(...args);
});

Guilded.on('message', (...args) => {
  Discord.send(...args);
  // Revolt.send(...args);
});

/*
Revolt.on('message', (...args) => {
  Discord.send(...args);
  Guilded.send(...args);
});
*/