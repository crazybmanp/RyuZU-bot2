import Discord, { Guild } from 'discord.js';

import { databaseCog as DatabaseCog, IDatabaseConsumer } from '../../core/database';
import { adminCog as AdminCog } from '../../core/admin';
import { Bot } from '../../lib/Bot'
import { Cog } from '../../lib/Cog';

import { MinecraftPlayer } from '.';
import { MinecraftServer } from '.';
import { EntityManager } from 'typeorm';
import { SubcommandHandler } from '../../lib/Subcommand';
import { SlashCommandSubcommandBuilder } from '@discordjs/builders';
import { MinecraftGuildConfig } from './MinecraftGuildConfig';
import { getUuidFromUsername } from './mojangApi';
import { getWhitelistedUsernames, unwhitelistPlayer, whitelistPlayer } from './rcon';
import { GuildMember, User } from '../../model';

export class MinecraftCog extends Cog implements IDatabaseConsumer {
	requires: string[] = ['core:database', 'core:admin'];
	cogName: string = 'minecraft';

	private manager: EntityManager;
	private databaseCog: DatabaseCog;
	private adminCog: AdminCog;

	constructor(bot: Bot) {
		super(bot);
	}

	getModels(): unknown[] {
		return [MinecraftPlayer, MinecraftServer, MinecraftGuildConfig];
	}

	giveManager(manager: EntityManager, database: DatabaseCog): void {
		this.manager = manager;
		this.databaseCog = database;
	}

	shutdownManager(): void {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		//@ts-ignore
		this.manager = undefined;
	}
	setup(): void {
		this.adminCog = this.bot.getCog<AdminCog>('admin');

		const minecraftCommand = new SubcommandHandler('minecraft', 'Minecraft subcommand');
		minecraftCommand.addSubcommand({
			command: 'whitelist',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('whitelist')
				.setDescription('Whitelist subcommand')
				.addStringOption(option =>
					option.setName('username')
						.setDescription('Your Minecraft username')
						.setRequired(true)),
			function: this.commandWhitelist.bind(this)
		});

		const minecraftAdminCommand = new SubcommandHandler('minecraftadmin', 'Commands to administrate the Minecraft module');
		minecraftAdminCommand.addSubcommand({
			command: 'set-whitelist-role',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('set-whitelist-role')
				.setDescription('Set the role that is allowed to whitelist themselves')
				.addRoleOption(option =>
					option.setName('role')
						.setDescription('The role that is allowed to whitelist themselves')
						.setRequired(true)),
			function: this.commandAdminSetWhitelistRole.bind(this)
		});

		minecraftAdminCommand.addSubcommand({
			command: 'block',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('block')
				.setDescription('Un-whitelist a user and block them from re-whitelisting themselves')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user to block')
						.setRequired(true)),
			function: this.commandAdminBlockPlayer.bind(this)
		});

		minecraftAdminCommand.addSubcommand({
			command: 'unblock',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('unblock')
				.setDescription('Re-whitelist a user and unblock them from re-whitelisting themselves')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The user to unblock')
						.setRequired(true)),
			function: this.commandAdminUnblockPlayer.bind(this)
		});

		minecraftAdminCommand.addSubcommand({
			command: 'sync',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('sync')
				.setDescription('Sync the whitelist for a single server with the database')
				.addStringOption(option =>
					option.setName('server')
						.setDescription('The server to sync')
						.setRequired(true)),
			function: this.commandAdminSync.bind(this)
		})

		this.bot.registerCommand({
			command: 'minecraft',
			commandBuilder: minecraftCommand.getSlashCommandBuilder(),
			function: minecraftCommand.resolveSubcommand.bind(minecraftCommand)
		});

		this.bot.registerCommand({
			command: 'minecraftadmin',
			commandBuilder: minecraftAdminCommand.getSlashCommandBuilder(),
			function: minecraftAdminCommand.resolveSubcommand.bind(minecraftAdminCommand)
		});

		this.bot.getCog<DatabaseCog>('database').registerCog(this);
	}

	private async resolveGuildMembership(interaction: Discord.CommandInteraction): Promise<[guild: Guild, guildMember: Discord.GuildMember, dbUser: User, dbGuildMember: GuildMember]> {
		const guild = interaction.guild;
		if (!guild) {
			throw Error('This command can only be used in a guild');
		}

		const dbUser = await this.databaseCog.findOrGetUser(interaction.user.id, guild.id);
		const dbGuildMember = dbUser.guildMember?.find(gm => gm.guildId === guild.id);

		if (!dbGuildMember) {
			throw Error('Failed to find DB GuildMember entity for user');
		}

		const guildMember = guild.members.resolve(interaction.user);
		if (!guildMember) {
			throw Error('Failed to resolve GuildMember for interaction');
		}

		return [guild, guildMember, dbUser, dbGuildMember];
	}

	private async commandWhitelist(interaction: Discord.CommandInteraction): Promise<void> {
		const username = interaction.options.getString('username', true);
		const [guild, , , dbGuildMember] = await this.resolveGuildMembership(interaction);

		if (!dbGuildMember) {
			throw Error('Failed to find GuildMembership for user');
		}

		let mcUuid: string = '';
		try {
			mcUuid = await getUuidFromUsername(username);
		} catch (e) {
			await interaction.reply({
				content: 'That Mineacraft username does not exist',
				ephemeral: true
			});
			return;
		}

		// Check if the user is in the whitelist role
		const guildMember = guild.members.resolve(interaction.user.id);
		if (!guildMember) {
			throw Error('Failed to resolve GuildMember for interaction');
		}
		const guildConfigRepo = this.manager.getRepository(MinecraftGuildConfig);
		const guildConfig = await guildConfigRepo.findOne({ where: { guildId: guild.id } });
		if (guildConfig && guildConfig.whitelistRole) {
			if (!guildMember.roles.cache.has(guildConfig.whitelistRole)) {
				// TODO: Send approval to admins
				await interaction.reply({
					content: 'You do not have permission to whitelist yourself',
					ephemeral: true
				});
				return;
			}
		}

		// Check if the user is already whitelisted
		const playerRepo = this.manager.getRepository(MinecraftPlayer);
		const existingPlayerByDiscord = await playerRepo.findOne({ where: { memberId: dbGuildMember.id } });
		if (existingPlayerByDiscord) {
			await interaction.reply({
				content: 'You are already whitelisted',
				ephemeral: true
			});
			return;
		}


		const existingPlayerByMinecraft = await playerRepo.findOne({
			where: {
				minecraftUuid: mcUuid,
				member: {
					guildId: guild.id
				}
			}
		});

		if (existingPlayerByMinecraft) {
			await interaction.reply({
				content: 'That Minecraft username is already linked to another Discord account on this server. You may need to ask an admin for help.',
				ephemeral: true
			});
			return;
		}

		const player = new MinecraftPlayer();
		player.minecraftUuid = mcUuid;
		player.minecraftUsername = username;
		player.member = dbGuildMember;
		await playerRepo.save(player);

		const serverRepo = this.manager.getRepository(MinecraftServer);
		const servers = await serverRepo.find({ where: { guildId: guild.id, whitelistingEnabled: true, enabled: true } });

		let problems = false;
		for (const server of servers) {
			try {
				if (server.needsSync) {
					await this.syncServer(server, guild);
				} else {
					const result = await whitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, username);
					if (result.warning) {
						this.bot.logger.warn(`Warning while whitelisting ${username} on ${server.name}: ${result.warning}`);
					}
					if (!result.success) {
						server.needsSync = true;
						await serverRepo.save(server);
						problems = true;
					}
				}
			} catch (e) {
				server.needsSync = true;
				await serverRepo.save(server);
				problems = true;
			}
		}

		if (problems) {
			await interaction.reply({
				content: 'You have been whitelisted, but there was a problem whitelisting you on one or more servers. You may need to ask an admin for help.',
			});
		} else {
			await interaction.reply({
				content: 'You have been whitelisted!',
			});
		}
	}

	private async commandAdminSetWhitelistRole(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember, ,] = await this.resolveGuildMembership(interaction);
		if (!this.adminCog.isManagerOnServer(guildMember)) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}
		const role = interaction.options.getRole('role', true);
		const guildConfigRepo = this.manager.getRepository(MinecraftGuildConfig);
		let guildConfig = await guildConfigRepo.findOne({ where: { guildId: guild.id } });
		if (!guildConfig) {
			guildConfig = new MinecraftGuildConfig();
			guildConfig.guildId = guild.id;
		}
		if (role === guild.roles.everyone) {
			guildConfig.whitelistRole = null;
			await guildConfigRepo.save(guildConfig);
			await interaction.reply({
				content: 'Cleared whitelist role; everyone is now allowed to whitelist themselves',
				ephemeral: true
			});
		} else {
			guildConfig.whitelistRole = role.id;
			await guildConfigRepo.save(guildConfig);
			await interaction.reply({
				content: `Set whitelist role to ${role.name}`,
				ephemeral: true
			});
		}
	}

	private async commandAdminBlockPlayer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember] = await this.resolveGuildMembership(interaction);

		if (!this.adminCog.isManagerOnServer(guildMember)) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}

		const target = interaction.options.getUser('user', true);
		const targetDbUser = await this.databaseCog.findOrGetUser(target.id, guild.id);
		const targetGuildMember = targetDbUser.guildMember?.find(m => m.guildId === guild.id);
		if (!targetGuildMember) {
			throw Error('Failed to resolve GuildMember for interaction (target of minecraft admin block player)');
		}

		const minecraftPlayerRepo = this.manager.getRepository(MinecraftPlayer);

		let minecraftPlayer = await minecraftPlayerRepo.findOne({
			where: {
				memberId: targetGuildMember.id
			}
		});
		if (!minecraftPlayer) {
			minecraftPlayer = new MinecraftPlayer();
			minecraftPlayer.member = targetGuildMember;
		}

		minecraftPlayer.blocked = true;
		await minecraftPlayerRepo.save(minecraftPlayer);

		if (minecraftPlayer.minecraftUsername && minecraftPlayer.minecraftUuid) {
			const serverRepo = this.manager.getRepository(MinecraftServer);
			const servers = await serverRepo.find({ where: { guildId: guild.id, whitelistingEnabled: true, enabled: true } });
			for (const server of servers) {
				try {
					const result = await unwhitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, minecraftPlayer.minecraftUsername, true);
					if (result.warning) {
						this.bot.logger.warn(`Warning while unwhitelisting ${minecraftPlayer.minecraftUsername} on ${server.name}: ${result.warning}`);
					}
					if (!result.success) {
						server.needsSync = true;
						await serverRepo.save(server);
					}
				} catch (e) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					this.bot.logger.warn(`Failed to unwhitelist player ${minecraftPlayer.minecraftUsername}`, { err: e });
					server.needsSync = true;
					await serverRepo.save(server);
				}
			}
		}
		await interaction.reply({
			content: 'User has been blocked',
			ephemeral: true
		});
	}

	private async commandAdminUnblockPlayer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember] = await this.resolveGuildMembership(interaction);

		if (!this.adminCog.isManagerOnServer(guildMember)) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}

		const target = interaction.options.getUser('user', true);
		const targetDbUser = await this.databaseCog.findOrGetUser(target.id, guild.id);
		const targetGuildMember = targetDbUser.guildMember?.find(m => m.guildId === guild.id);
		if (!targetGuildMember) {
			throw Error('Failed to resolve GuildMember for interaction (target of minecraft admin block player)');
		}

		const minecraftPlayerRepo = this.manager.getRepository(MinecraftPlayer);

		const minecraftPlayer = await minecraftPlayerRepo.findOne({
			where: {
				memberId: targetGuildMember.id
			}
		});
		if (!minecraftPlayer || !minecraftPlayer.blocked) {
			await interaction.reply({
				content: 'User is not blocked',
				ephemeral: true
			});
			return;
		}

		let problems = false;

		if (!minecraftPlayer.minecraftUsername || !minecraftPlayer.minecraftUuid) {
			await minecraftPlayerRepo.remove(minecraftPlayer);
		} else {
			minecraftPlayer.blocked = false;
			await minecraftPlayerRepo.save(minecraftPlayer);
			const serverRepo = this.manager.getRepository(MinecraftServer);
			const servers = await serverRepo.find({ where: { guildId: guild.id, whitelistingEnabled: true, enabled: true } });
			for (const server of servers) {
				try {
					const result = await whitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, minecraftPlayer.minecraftUsername);
					if (result.warning) {
						this.bot.logger.warn(`Warning while whitelisting ${minecraftPlayer.minecraftUsername} on ${server.name}: ${result.warning}`);
					}
					if (!result.success) {
						problems = true;
						server.needsSync = true;
						await serverRepo.save(server);
					}
				} catch (e) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					this.bot.logger.warn('Failed to unwhitelist player', { err: e });
					problems = true;
					server.needsSync = true;
					await serverRepo.save(server);
				}
			}
		}

		await interaction.reply({
			content: problems ? 'User has been restored, but re-whitelisting failed on one or more servers' : 'User has been restored',
			ephemeral: true
		});
	}

	private async commandAdminSync(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember] = await this.resolveGuildMembership(interaction);

		if (!this.adminCog.isManagerOnServer(guildMember)) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}
		const serverName = interaction.options.getString('server', true);
		const serverRepo = this.manager.getRepository(MinecraftServer);
		const server = await serverRepo.findOne({ where: { guildId: guild.id, whitelistingEnabled: true, enabled: true, name: serverName } });
		if (!server) {
			const validServerNames = (await serverRepo.find({ where: { guildId: guild.id, whitelistingEnabled: true, enabled: true } })).map(s => s.name);
			await interaction.reply({
				content: 'Server not found, please choose from this list: ' + validServerNames.join(', '),
				ephemeral: true
			});
			return;
		}
		const syncResult = await this.syncServer(server, guild);
		if (syncResult.totalSuccess) {
			await interaction.reply({
				content: 'Sync complete',
				ephemeral: true
			});
		} else {
			const embedBuilder = new Discord.MessageEmbed();
			embedBuilder.setTitle('Sync Report');
			embedBuilder.setDescription('Sync complete, but there were some issues');
			embedBuilder.addFields(
				{
					name: 'Failed to add',
					value: syncResult.failedAddUsernames.join(', ')
				},
				{
					name: 'Failed to remove',
					value: syncResult.failedRemoveUsernames.join(', ')
				}
			);
			await interaction.reply({
				content: 'Sync complete, but there were some issues',
				embeds: [embedBuilder],
				ephemeral: true
			});
		}
	}

	private async syncServer(server: MinecraftServer, guild: Discord.Guild): Promise<{ totalSuccess: boolean, failedAddUsernames: string[], failedRemoveUsernames: string[] }> {
		const failedAddUsernames: string[] = [];
		const failedRemoveUsernames: string[] = [];
		const whitelistPerServer = await getWhitelistedUsernames(server.rconHost, server.rconPort, server.rconPassword);
		const playerRepo = this.manager.getRepository(MinecraftPlayer);
		// Get all of the players whre their member (which is a GuildMember object) is on this server
		const players = await playerRepo.find({
			select: ['minecraftUsername'],
			where: {
				member: {
					guildId: guild.id
				},
				blocked: false
			}
		});
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const whitelistPerDatabase = players.map(x => x.minecraftUsername!);

		whitelistPerServer.sort();
		whitelistPerDatabase.sort();
		let sIndex = 0;
		let dIndex = 0;

		while (sIndex < whitelistPerServer.length || dIndex < whitelistPerDatabase.length) {
			this.bot.logger.debug('Syncing server', { sIndex, dIndex, perServer: whitelistPerServer[sIndex], perDb: whitelistPerDatabase[dIndex] });
			if (whitelistPerServer[sIndex] === whitelistPerDatabase[dIndex]) {
				sIndex++;
				dIndex++;
				continue;
			} else if (whitelistPerServer[sIndex] < whitelistPerDatabase[dIndex] || !whitelistPerDatabase[dIndex]) {
				try {
					const result = await unwhitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, whitelistPerServer[sIndex], true);
					if (!result.success) {
						this.bot.logger.warn('Failed to unwhitelist player', { error: result.error })
						failedRemoveUsernames.push(whitelistPerServer[sIndex]);
					}
				} catch (e) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					this.bot.logger.warn('Failed to unwhitelist player', { err: e });
					failedRemoveUsernames.push(whitelistPerServer[sIndex]);
				}
				sIndex++;
			} else {
				try {
					const result = await whitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, whitelistPerDatabase[dIndex]);
					if (!result.success) {
						this.bot.logger.warn('Failed to whitelist player', { error: result.error })
						failedAddUsernames.push(whitelistPerDatabase[dIndex]);
					}
				} catch (e) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					this.bot.logger.warn('Failed to whitelist player', { err: e });
					failedAddUsernames.push(whitelistPerDatabase[dIndex]);
				}
				dIndex++;
			}
		}
		const totalSuccess = failedAddUsernames.length === 0 && failedRemoveUsernames.length === 0;
		if (totalSuccess) {
			server.needsSync = false;
			await this.manager.save(server);
		}
		return {
			totalSuccess,
			failedAddUsernames,
			failedRemoveUsernames
		};
	}
}

export default (bot: Bot): MinecraftCog => new MinecraftCog(bot);