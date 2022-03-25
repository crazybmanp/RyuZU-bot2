import Discord, { Client, Message } from 'discord.js';
import fs from 'fs';
import { Cog } from './Cog';
import Logger from 'bunyan';

type CogFactory = (bot: Bot) => Cog;
//type CommandFunction = (msg: Message) => Promise<void>|void

export class Bot {
	constructor(configFile: string) {
		this.ready = false;
		this.loadedCogs = {};
		this.listeners = {};

		const contents = fs.readFileSync(configFile).toString();
		this.config = JSON.parse(contents);

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const pjson = require('../package.json');
		this.version = pjson.version;

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const loggerCog: Cog = (require('../logger.js').default as CogFactory)(this);
		this.loadedCogs['../logger.js'] = loggerCog;
		loggerCog.preinit();

		this.logger.info("RyuZu " + this.version + " starting up.");

		this.client = new Discord.Client({
			intents: [
				"GUILDS",
				"GUILD_MEMBERS",
				"GUILD_BANS",
				"GUILD_EMOJIS_AND_STICKERS",
				"GUILD_INTEGRATIONS",
				"GUILD_WEBHOOKS",
				"GUILD_INVITES",
				"GUILD_VOICE_STATES",
				"GUILD_PRESENCES",
				"GUILD_MESSAGES",
				"GUILD_MESSAGE_REACTIONS",
				"GUILD_MESSAGE_TYPING",
				"DIRECT_MESSAGES",
				"DIRECT_MESSAGE_REACTIONS",
				"DIRECT_MESSAGE_TYPING",
			]
		});
	}

	listeners: { [key: string]: (msg: Message) => void };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	config: { [key: string]: any };
	client: Client;
	loadedCogs: { [key: string]: Cog };
	ready: boolean;
	version: string;

	logger: Logger;

	registerCommand(command, func) {
		this.listeners[command] = func;
	}

	loadCog(cogname: string) {
		if (cogname in this.loadedCogs) {
			return;
		}
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const e: Cog = (require(`../${cogname}`).default as CogFactory)(this);
			if (Array.isArray(e.requires) && e.requires.length > 0) {
				this.logger.info('Module ' + cogname + ' requires: ' + e.requires);
				for (let i = 0; i < e.requires.length; i++) {
					this.loadCog(e.requires[i]);
				}
			}
			this.logger.info('Loading ' + cogname + '...');
			e.setup();
			this.loadedCogs[cogname] = e;
		} catch (err) {
			this.logger.error('Failed to load ' + cogname, { err: err });
			process.exit();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}