import Discord, { Client, Guild, Message, PresenceData } from 'discord.js';
import fs from 'fs';
import { Cog } from './Cog';
import Logger from 'bunyan';
import { loggerCog } from '../logger';
import { ActivityTypes } from 'discord.js/typings/enums';

type CogFactory = (bot: Bot) => Cog;
//type CommandFunction = (msg: Message) => Promise<void>|void

const coreCogs = ['./admin.js', './util.js'];

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
		const LCInstance: loggerCog = ((require('../logger.js').default as CogFactory)(this) as loggerCog);
		this.loadedCogs[LCInstance.cogName] = LCInstance;
		LCInstance.preinit();

		this.logger.info('RyuZu ' + this.version + ' starting up.');

		this.client = new Discord.Client({
			intents: [
				'GUILDS',
				'GUILD_MEMBERS',
				'GUILD_BANS',
				'GUILD_EMOJIS_AND_STICKERS',
				'GUILD_INTEGRATIONS',
				'GUILD_WEBHOOKS',
				'GUILD_INVITES',
				'GUILD_VOICE_STATES',
				'GUILD_PRESENCES',
				'GUILD_MESSAGES',
				'GUILD_MESSAGE_REACTIONS',
				'GUILD_MESSAGE_TYPING',
				'DIRECT_MESSAGES',
				'DIRECT_MESSAGE_REACTIONS',
				'DIRECT_MESSAGE_TYPING',
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

	async setup() {
		// register base commands
		this.registerCommands();

		// Load Core Cogs
		coreCogs.forEach(function (element) {
			this.loadCog(element);
		}, this);

		// Load Startup Cogs
		this.config.startupExtensions.forEach(function (element) {
			this.loadCog(element);
		}, this);

		this.logger.info(`Starting postSetup`);
		const postSetup: Promise<unknown>[] = [];
		for (const cog in this.loadedCogs) {
			postSetup.push(this.loadedCogs[cog].postSetup());
		}
		await Promise.all(postSetup);

		// start the client
		await this.client.login(this.config.token);
	}

	registerCommand(command, func) {
		this.listeners[command] = func;
	}

	async loadCog(cogname: string) {
		if (cogname in this.loadedCogs) {
			return;
		}
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const e: Cog = (require(`../${cogname}`).default as CogFactory)(this);
			if (Array.isArray(e.requires) && e.requires.length > 0) {
				this.logger.info('Module ' + cogname + ' requires: ' + e.requires);
				for (let i = 0; i < e.requires.length; i++) {
					await this.loadCog(e.requires[i]);
				}
			}
			this.logger.info('Loading ' + cogname + '...');
			await e.setup();
			this.loadedCogs[e.cogName] = e;
		} catch (err) {
			this.logger.error('Failed to load ' + cogname, { err: err });
			process.exit();
		}
	}

	getCog<Type extends Cog>(cogName: string): Type | undefined {
		const cog = this.loadedCogs[cogName];
		if (cog === undefined || cog.cogName !== cogName) {
			return undefined;
		}
		return cog as Type;
	}

	async doReady() {
		this.logger.info(`Logged in as ${this.client.user.tag}! Now readying up!`);
		for (const cogName in this.loadedCogs) {
			const cog = this.loadedCogs[cogName];
			this.logger.info('Readying ' + cogName);
			await cog.ready();
		}

		const presence: PresenceData = {
			status: 'online',
			afk: false,
			activities: [{
				name: this.config.commandString + ' ' + this.config.gameMessage + '[' + this.version + ']',
				type: ActivityTypes.PLAYING
			}]
		};
		this.client.user.setPresence(presence);
		this.ready = true;
		this.logger.info('RyuZu ' + this.version + ' ready!');
	}

	doGuildCreate(guild: Guild) {
		this.logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
		for (const cogName in this.loadedCogs) {
			const cog = this.loadedCogs[cogName];
			this.logger.info('Notifying ' + cogName + ' of new guild.');
			void cog.newGuild(guild);
		}
	}

	async doMessage(msg: Message) {
		if (!this.ready) {
			this.logger.warn('BOT RECIEVED MESSAGE BEFORE READY COMPLETED');
			return;
		}
		if (!msg.content.startsWith(this.config.commandString)) {
			return;
		}
		msg.content = msg.content.substr(this.config.commandString.length, msg.content.length);
		const command = msg.content.split(' ')[0];
		msg.content = msg.content.substr(command.length + 1, msg.content.length);
		const fn = this.listeners[command];
		await msg.channel.sendTyping();
		if (typeof fn === 'function') {
			try {
				await fn(msg);
			} catch (error) {
				this.logger.error('Command error on input: ' + msg.content, { error });
			}
		} else {
			void msg.reply('I don\'t quite know what you want from me... [not a command]');
		}
	}

	registerCommands() {
		this.client.on('ready', this.doReady.bind(this));
		this.client.on('guildCreate', this.doGuildCreate.bind(this));
		this.client.on('message', this.doMessage.bind(this));
		this.registerCommand('ping', async function (msg) {
			await msg.reply('Pong!');
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}