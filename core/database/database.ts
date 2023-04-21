import { Command } from 'commander';
import Discord from 'discord.js';
import { DataSource, EntityManager } from 'typeorm';
import { Bot } from '../../lib/Bot';
import { Cog } from '../../lib/Cog';
import { ICommandProvider } from '../../lib/interfaces/ICommandProvider';
import { IFunctionProvider } from '../../lib/interfaces/IFunctionProvider';
import { Guild } from '../../model/Guild';
import { GuildMember } from '../../model/GuildMember';
import { User } from '../../model/User';
import { IDatabaseConsumer } from './IDatabaseConsumer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entities = any[];
const baseModels: Entities = [Guild, User, GuildMember]

export class databaseCog extends Cog implements IFunctionProvider, ICommandProvider{
	requires: string[] = [];
	cogName: string = 'database';

	private registeredConsumers: IDatabaseConsumer[];
	private models: Entities;
	private datasource: DataSource;

	constructor(bot: Bot) {
		super(bot);
		this.registeredConsumers = [];
		this.models = [];
	}

	getCommands(): Command[] {
		return [
			new Command()
				.name('syncDatabase')
				.description('Sync the database with the current state of the bot.')
				.action(async () => {
					this.bot.logger.info('Syncing database...');

					await this.datasource.synchronize();

					this.bot.logger.info('Database synced! Ready to go!');
				})
			]
	}

	async postSetup(): Promise<void> {
		this.models.push(...baseModels);
		for (const consumer of this.registeredConsumers) {
			this.bot.logger.debug(`Registering models for ${consumer.cogName} cog.`);
			this.models.push(...consumer.getModels());
		}

		this.bot.logger.info(`Database cog loading ${this.models.length} models.`);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const DSO: any = {};
		Object.assign(DSO,
			{
				entities: this.models,
				...this.bot.config.database
			}
		)
		const datasource = new DataSource(DSO);

		this.bot.logger.info('Connecting to database...');
		await datasource.initialize()
			.then(() => {
				this.bot.logger.info('Data Source has been initialized!')
			})
			.catch((err) => {
				this.bot.logger.error('Error during Data Source initialization', err)
			})

		this.datasource = datasource;
	}

	async ready(): Promise<void> {
		const schema = await this.datasource.driver.createSchemaBuilder().log();

		if (schema.upQueries.length > 0) {
			this.bot.logger.error('Database schema has changed. Please run `sync` to sync the database. It is recommended to backup the database before doing so.', {'upQueries': schema.upQueries});
			process.exit(1);
		}

		if (!this.datasource.isInitialized) {
			this.bot.logger.error(`Database is not initialized, bot cannot start.`);
			process.exit(1);
		}

		for (const [,guild] of await this.bot.client.guilds.fetch()) {
			await this.addGuild(guild);
		}

		for (const consumer of this.registeredConsumers) {
			consumer.giveManager(this.getManager(), this);
		}
	}

	async shutdown(): Promise<void> {
		for (const consumer of this.registeredConsumers) {
			consumer.shutdownManager();
		}

		await this.datasource.destroy();

		await super.shutdown();
	}

	registerCog(target: IDatabaseConsumer): void {
		this.bot.logger.debug(`Registering cog ${target.cogName} for database.`);
		this.registeredConsumers.push(target);
	}

	getManager(): EntityManager {
		return this.datasource.createEntityManager();
	}

	async newGuild(guild: Discord.Guild): Promise<void> {
		await this.addGuild(guild);
	}

	async getGuild(guildId: string): Promise<Guild | null> {
		return this.datasource.manager.findOneBy(Guild, { id: guildId });
	}

	async addGuild(guild: Discord.BaseGuild): Promise<void> {
		if (await this.getGuild(guild.id)) {
			return;
		}

		this.bot.logger.info(`Adding guild ${guild.name} to database.`);

		const newGuild = new Guild();
		newGuild.id = guild.id;
		newGuild.name = guild.name;

		await this.datasource.manager.save(newGuild);
	}

	async guildMembership(user: User, guildId: string): Promise<User|undefined> {
		const guild = this.bot.client.guilds.resolve(guildId);
		if (!guild) {
			this.bot.logger.warn(`Failed to find guild ${guildId} for user ${user.id}`);
			return;
		}

		const member = guild.members.resolve(user.id);
		if (!member) {
			this.bot.logger.warn(`Failed to find member ${user.id} in guild ${guildId}`);
			return;
		}

		const GM = new GuildMember();
		GM.guildId = guildId;
		GM.userId = user.id;
		GM.nickname = member.nickname ?? undefined;

		await this.datasource.manager.save(GM)

		const newuser = await this.getUser(user.id)
		if (!newuser)
		{
			throw Error('Failed to find user we just added.');
		}
		return newuser;
	}

	async findOrGetUser(userId: string, guildId: string): Promise<User> {
		let user = await this.getUser(userId);
		if (!user) {
			const guild = this.bot.client.guilds.resolve(guildId);
			if (!guild) {
				throw Error('Failed to find guild.');
			}
			const member = guild.members.resolve(userId);

			if (!member) {
				throw Error('Failed to find user in guild.');
			}

			user = await this.addUser(member.user);
		}

		if (user.guildMember && user.guildMember.some(gm => gm.guildId === guildId)) {
			return user;
		} else {
			const updatedUser = await this.guildMembership(user, guildId);
			if(updatedUser) {
				return updatedUser;
			} else {
				throw Error('Failed to find user in guild.');
			}
		}
	}

	async getUser(id: string): Promise<User|null> {
		return this.datasource.manager.findOne(User, { where: { id: id }, relations: ['guildMember'] });
	}

	async addUser(user: Discord.User): Promise<User> {
		const tu = await this.getUser(user.id)
		if (tu) {
			return tu;
		}

		this.bot.logger.debug(`Adding user ${user.username} to database.`);

		const newUser = new User();
		newUser.id = user.id;
		newUser.displayName = user.username;
		newUser.discriminator = user.discriminator;

		return this.datasource.manager.save(newUser);
	}
}

export default (bot: Bot): databaseCog => {return new databaseCog(bot);}