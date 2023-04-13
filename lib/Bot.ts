import Discord, { Client, CommandInteraction, Guild, Interaction, PresenceData } from 'discord.js';
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9';
import fs from 'fs';
import { Cog } from './Cog';
import Logger from 'bunyan';
import { loggerCog } from '../logger';
import { ActivityTypes } from 'discord.js/typings/enums';
import { Config } from '../model/Config';
import { SlashCommandBuilder } from '@discordjs/builders';

export type CogFactory = (bot: Bot) => Cog;
export type CommandFunction = (interaction: Interaction) => Promise<void> | void;
export type CommandRegistration = {
	command: string,
	commandBuilder: Partial<SlashCommandBuilder>,
	function: CommandFunction,
}

const coreCogs = ['./admin.js', './util.js'];

export class Bot {
	commands: CommandRegistration[];
	config: Config;
	client: Client;
	loadedCogs: { [key: string]: Cog };
	ready: boolean;
	version: string;

	logger: Logger;

	readonly devMode: boolean;
	readonly commandDevMode = (): boolean => !!this.commandGuildServer;
	readonly commandGuildServer: string[]|undefined;

	constructor(configFile: string) {
		this.ready = false;
		this.loadedCogs = {};
		this.commands = [];

		const contents = fs.readFileSync(configFile).toString();
		this.config = (JSON.parse(contents) as Config); //TODO: Is there a way to make this type safe better?

		this.devMode = this.config.devMode ?? false;
		if (this.devMode && this.config.CommandServerRegistration) {
			this.commandGuildServer = this.config.CommandServerRegistration.CommandServerList;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
		this.version = (require('../package.json').version as string);

		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
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

	async setup(): Promise<void> {
		// register base commands
		this.registerCommands();

		// Load Core Cogs
		for (const cog of coreCogs) {
			await this.loadCog(cog);
		}

		// Load Startup Cogs
		for (const cog of this.config.startupExtensions) {
			await this.loadCog(cog);
		}

		this.logger.info(`Starting postSetup`);
		const postSetup: (Promise<unknown> | void)[] = [];
		for (const cog in this.loadedCogs) {
			postSetup.push(this.loadedCogs[cog].postSetup());
		}
		await Promise.all(postSetup);
	}

	async connectToDiscord(): Promise<void> {
		await this.registerInteractions();

		// start the client
		await this.client.login(this.config.token);
	}

	private async registerInteractions(): Promise<void> {
		const rest = new REST({ version: '9' }).setToken(this.config.token);

		const commands = this.commands.map(c => c.commandBuilder.toJSON());

		this.logger.info(`Registering ${commands.length} commands`);

		try {
			if (this.commandDevMode()) {
				this.logger.info(`Registering commands in debug mode for ${this.commandGuildServer.join(', ')}`);
				for (const guild of this.commandGuildServer) {
					await rest.put(Routes.applicationGuildCommands(this.config.applicationId, guild), { body: commands });
				}
			} else {
				await rest.put(Routes.applicationCommands(this.config.applicationId), { body: commands });
			}
		} catch (error) {
			this.logger.error(`Error while registering interactions to the discord REST api`, error);
			process.exit(1);
		}
	}

	public async deregisterInteractions(): Promise<void> {
		const rest = new REST({ version: '9' }).setToken(this.config.token);

		const promises: Promise<unknown>[] = [];
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const appCommands = (await rest.get(Routes.applicationCommands(this.config.applicationId)) as any[]);

			this.logger.info(`Deregistering ${appCommands.length} commands`);

			for (const command of appCommands) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
				promises.push(rest.delete(`${Routes.applicationCommands(this.config.applicationId)}/${command.id}`));
			}

			if (this.commandGuildServer) {
				for (const guild of this.commandGuildServer) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const appGuildCommands = (await rest.get(Routes.applicationGuildCommands(this.config.applicationId, guild)) as any[]);

					this.logger.info(`Deregistering ${appGuildCommands.length} commands in ${guild}`);

					for (const command of appGuildCommands) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
						promises.push(rest.delete(`${Routes.applicationGuildCommands(this.config.applicationId, guild)}/${command.id}`));
					}
				}
			}

			await Promise.all(promises);
		} catch (error) {
			this.logger.error(`Error while deregistering interactions to the discord REST api`, error);
			process.exit(1);
		}
	}

	registerCommand(reg: CommandRegistration): void {
		if (this.ready) {
			this.logger.error(`Cog tried to register command ${reg.command} after bot was ready. Commands must be registered before the bot is ready.`);
			return;
		}
		this.commands.push(reg);
	}

	async loadCog(cogname: string): Promise<void> {
		if (cogname in this.loadedCogs) {
			return;
		}
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
			const e: Cog = (require(`../${cogname}`).default as CogFactory)(this);
			if (e.requires.length > 0) {
				this.logger.info(`Module ${cogname} requires ${e.requires.join(', ')}`);
				for (let i = 0; i < e.requires.length; i++) {
					await this.loadCog(e.requires[i]);
				}
			}
			this.logger.info('Loading ' + cogname + '...');
			await e.setup();
			this.loadedCogs[e.cogName] = e;
		} catch (err: unknown) {
			this.logger.error('Failed to load ' + cogname, { err: err });
			process.exit(1);
		}
	}

	getCog<Type extends Cog>(cogName: string): Type | undefined {
		const cog = this.loadedCogs[cogName];
		if (cog === undefined || cog.cogName !== cogName) {
			return undefined;
		}
		return cog as Type;
	}

	async doReady(): Promise<void> {
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
				name: `${this.config.gameMessage}[${this.version}]`,
				type: ActivityTypes.PLAYING
			}]
		};
		this.client.user.setPresence(presence);

		this.ready = true;
		this.logger.info('RyuZu ' + this.version + ' ready!');
	}

	doGuildCreate(guild: Guild): void {
		this.logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
		for (const cogName in this.loadedCogs) {
			const cog = this.loadedCogs[cogName];
			this.logger.info('Notifying ' + cogName + ' of new guild.');
			void cog.newGuild(guild);
		}
	}

	async doInteractionCreate(interaction: Interaction): Promise<void> {
		if (!this.ready) {
			this.logger.warn('BOT RECIEVED INTERACTION BEFORE READY COMPLETED');
			return;
		}
		if (interaction.isCommand()) {
			const command = this.commands.find(c => c.command === interaction.commandName);
			if (!command) {
				this.logger.error('Command not found: ' + interaction.commandName);
				await interaction.reply('Something seems to be wrong with this command. Please contact the owner.');
			}
			await command.function(interaction);
		}
	}

	registerCommands(): void {
		this.client.on('ready', this.doReady.bind(this));
		this.client.on('guildCreate', this.doGuildCreate.bind(this));
		this.client.on('interactionCreate', this.doInteractionCreate.bind(this));
		//this.client.on('message', this.doMessage.bind(this));
		const cb = new SlashCommandBuilder()
			.setName('ping')
			.setDescription('Ping the bot');
		const pingCommand: CommandRegistration = {
			command: 'ping',
			commandBuilder: cb,
			function: (async function (interaction: CommandInteraction) {
				await interaction.reply('Pong!');
			})
		};
		this.registerCommand(pingCommand);
	}
}