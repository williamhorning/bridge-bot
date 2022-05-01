import 'dotenv/config'; // in the .env file, set the variables GUILDED_TOKEN, GUILDED_ID, DISCORD_TOKEN, and DISCORD_ID
import { KVNamespace } from '@miniflare/kv'; // used for KV storage
import { FileStorage } from '@miniflare/storage-file'; // used to persist data
import DiscordBridge from './discord.js';
import GuildedBridge from './guilded.js';

const kv = new KVNamespace(new FileStorage('./kv')); // Guilded ID is key

const Discord = new DiscordBridge();
const Guilded = new GuildedBridge();

Discord.setup(kv);
Guilded.setup(kv);

Discord.on('message', (...args)=>{Guilded.send(...args)});
Guilded.on('message', (...args)=>{Discord.send(...args)});