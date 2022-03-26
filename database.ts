import { Guild } from './Model/Guild';
import { DataSource, EntityManager } from 'typeorm';
import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';
import { IDatabaseConsumer } from './lib/IDatabaseConsumer';
import { IFunctionProvider } from './lib/IFunctionProvider';
import Discord from 'discord.js';
import { User } from './Model/User';
import { GuildMember } from './Model/GuildMember';


const baseModels = [Guild, User, GuildMember]

export class databaseCog extends Cog implements IFunctionProvider{
	requires: string[] = [];
	cogName: string = 'database';

	private registeredConsumers: IDatabaseConsumer[];
	private models: unknown[];
	private datasource: DataSource;

	constructor(bot: Bot) {
		super(bot);
		this.registeredConsumers = [];
		this.models = [];
	}

	async postSetup() {
		this.models.push(...baseModels);
		for (const consumer of this.registeredConsumers) {
			this.bot.logger.debug(`Registering models for ${consumer.cogName} cog.`);
			this.models.push(...consumer.getModels());
		}
		this.bot.logger.debug(`Database cog loading ${this.models.length} models.`);
		this.bot.logger.debug(`Loaded Models: ${ this.models }`);
		const datasource = new DataSource({
			synchronize: true,
			entities: this.models,
			...this.bot.config.database
		});
		this.bot.logger.info('Connecting to database...');
		await datasource.initialize()
			.then(() => {
				this.bot.logger.info('Data Source has been initialized!')
			})
			.catch((err) => {
				this.bot.logger.error('Error during Data Source initialization', err)
			})
		await datasource.synchronize();
		this.datasource = datasource;

		for (const consumer of this.registeredConsumers) {
			consumer.giveManager(this.getManager(), this);
		}
	}

	async ready(): Promise<void> {
		for (const [,guild] of await this.bot.client.guilds.fetch()) {
			await this.addGuild(guild);
		}
	}

	async shutdown(): Promise<void> {
		for (const consumer of this.registeredConsumers) {
			consumer.shutdownManager();
		}

		await this.datasource.destroy();

		await super.shutdown();
	}

	registerCog(target: Cog): void {
		this.bot.logger.debug(`Registering cog ${target.cogName} for database.`);
		this.registeredConsumers.push(target as IDatabaseConsumer);
	}

	getManager(): EntityManager {
		return this.datasource.createEntityManager();
	}

	async newGuild(guild: Discord.Guild): Promise<void> {
		await this.addGuild(guild);
	}

	async getGuild(guildId: string): Promise<Guild> {
		return this.datasource.manager.findOneBy(Guild, { id: guildId });
	}

	async addGuild(guild: Discord.BaseGuild) {
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
		const member = guild.members.resolve(user.id);

		if (!member) {
			return;
		}

		const GM = new GuildMember();
		GM.guildId = guildId;
		GM.userId = user.id;
		GM.nickname = member.nickname;
		this.bot.logger.debug(GM);

		await this.datasource.manager.save(GM)

		return this.getUser(user.id);
	}

	async findOrGetUser(userId: string, guildId: string): Promise<User> {
		let user = await this.getUser(userId);
		if (!user) {
			const guild = this.bot.client.guilds.resolve(guildId);
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

	async getUser(id: string): Promise<User> {
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

export default (bot: Bot) => {return new databaseCog(bot);}