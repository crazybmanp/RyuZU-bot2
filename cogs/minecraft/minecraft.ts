import Discord, { Guild } from 'discord.js';

import { databaseCog as DatabaseCog, IDatabaseConsumer } from '../../core/database';
import { adminCog as AdminCog } from '../../core/admin';
import { utilCog as UtilCog } from '../../core/util';
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
import { SubcommandGroupHandler } from '../../lib/SubcommandGroup';

export class MinecraftCog extends Cog implements IDatabaseConsumer {
	requires: string[] = ['core:database', 'core:admin', 'core:util'];
	cogName: string = 'minecraft';

	private manager: EntityManager;
	private databaseCog: DatabaseCog;
	private adminCog: AdminCog;
	private utilCog: UtilCog;

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
		this.utilCog = this.bot.getCog<UtilCog>('util');

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
		});

		minecraftAdminCommand.addSubcommand({
			command: 'set-admin-channel',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('set-admin-channel')
				.setDescription('Set the admin channel for the Minecraft cog')
				.addChannelOption(option =>
					option.setName('channel')
						.setDescription('The channel to set as the admin channel')
						.setRequired(false)),
			function: this.commandAdminSetAdminChannel.bind(this)
		});

		const minecraftAdminServerGroup = new SubcommandGroupHandler('server', 'Commands to administrate Minecraft servers');
		minecraftAdminServerGroup.addSubcommand({
			command: 'add',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('add')
				.setDescription('Add a Minecraft server')
				.addStringOption(option =>
					option.setName('name')
						.setDescription('The name of the server')
						.setRequired(true))
				.addBooleanOption(option =>
					option.setName('whitelist-managed')
						.setDescription('Whether or not the bot manages the servers whitelist')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('rcon-host')
						.setDescription('The host of the RCON server')
						.setRequired(true))
				.addIntegerOption(option =>
					option.setName('rcon-port')
						.setDescription('The port of the RCON server')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('rcon-password')
						.setDescription('The password of the RCON server')
						.setRequired(true)),
			function: this.commandAdminAddServer.bind(this)
		});

		minecraftAdminServerGroup.addSubcommand({
			command: 'list',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('list')
				.setDescription('List all Minecraft servers'),
			function: this.commandAdminListServers.bind(this)
		});

		minecraftAdminServerGroup.addSubcommand({
			command: 'modify',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('modify')
				.setDescription('Modify a Minecraft server')
				.addStringOption(option =>
					option.setName('name')
						.setDescription('The name of the server to modify')
						.setRequired(true))
				.addBooleanOption(option =>
					option.setName('whitelist-managed')
						.setDescription('Whether or not the bot manages the servers whitelist')
						.setRequired(false))
				.addBooleanOption(option =>
					option.setName('enabled')
						.setDescription('Whether or not the server is enabled')
						.setRequired(false))
				.addStringOption(option =>
					option.setName('rcon-host')
						.setDescription('The host of the RCON server')
						.setRequired(false))
				.addIntegerOption(option =>
					option.setName('rcon-port')
						.setDescription('The port of the RCON server')
						.setRequired(false))
				.addStringOption(option =>
					option.setName('rcon-password')
						.setDescription('The password of the RCON server')
						.setRequired(false)),
			function: this.commandAdminModifyServer.bind(this)
		});

		minecraftAdminServerGroup.addSubcommand({
			command: 'delete',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('delete')
				.setDescription('Delete a Minecraft server')
				.addStringOption(option =>
					option.setName('name')
						.setDescription('The name of the server to delete')
						.setRequired(true)),
			function: this.commandAdminDeleteServer.bind(this)
		});

		minecraftAdminCommand.addSubcommandGroup(minecraftAdminServerGroup);

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

	private async resolveGuildMembership(interaction: Discord.CommandInteraction): Promise<[guild: Guild, guildMember: Discord.GuildMember, dbUser: User, dbGuildMember: GuildMember, mcGuildConfig?: MinecraftGuildConfig]> {
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

		const mcGuildConfig = await this.manager.findOne(MinecraftGuildConfig, { where: { guildId: guild.id } });

		return [guild, guildMember, dbUser, dbGuildMember, mcGuildConfig || undefined];
	}

	private async sendAdminMessage(message: Discord.MessagePayload | Discord.MessageOptions, mcGuildConfig?: MinecraftGuildConfig): Promise<void> {
		if (!mcGuildConfig?.adminChannelId) return;
		const adminChannel = await this.bot.client.channels.fetch(mcGuildConfig.adminChannelId);
		if (!adminChannel) {
			throw Error('Failed to find admin channel');
		}

		if (!adminChannel.isText()) {
			throw Error('Admin channel is not a text channel');
		}
		await adminChannel.send(message);
	}

	private async commandWhitelist(interaction: Discord.CommandInteraction): Promise<void> {
		const username = interaction.options.getString('username', true);
		const [guild, , , dbGuildMember, mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!dbGuildMember) {
			throw Error('Failed to find GuildMembership for user');
		}

		let mcUuid: string = '';
		try {
			mcUuid = await getUuidFromUsername(username);
		} catch (e) {
			await interaction.reply({
				content: 'That Minecraft username does not exist',
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
				if (mcGuildConfig?.adminChannelId) {
					await interaction.reply({
						content: 'You do not have permission to whitelist yourself, but a request to whitelist you has been sent to the admins',
						ephemeral: true
					});
					const adminChannel = guild.channels.resolve(mcGuildConfig.adminChannelId);
					if (adminChannel && adminChannel.isText()) {
						// TODO: Approve and Deny interaction
						await adminChannel.send({
							content: `<@${interaction.user.id}> has requested to be whitelisted with the username ${username}`
						});
					}
					return;
				} else {
					await interaction.reply({
						content: 'You do not have permission to whitelist yourself',
						ephemeral: true
					});
					return;
				}
			}
		}

		const serverRepo = this.manager.getRepository(MinecraftServer);
		const servers = await serverRepo.find({ where: { guildId: guild.id, managedWhitelist: true, enabled: true } });

		// Check if the user is already whitelisted
		const playerRepo = this.manager.getRepository(MinecraftPlayer);
		const existingPlayerByDiscord = await playerRepo.findOne({ where: { memberId: dbGuildMember.id } });
		if (existingPlayerByDiscord) {
			if (existingPlayerByDiscord.minecraftUuid === mcUuid) {
				await interaction.reply({
					content: 'You are already whitelisted',
					ephemeral: true
				});
				return;
			}

			if (existingPlayerByDiscord.blocked) {
				await interaction.reply({
					content: 'You are blocked from Minecraft',
					ephemeral: true
				});
				return;
			}

			const oldUsername = existingPlayerByDiscord.minecraftUsername;
			if (oldUsername) {
				for (const server of servers) {
					try {
						const result = await unwhitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, oldUsername, true);
						if (!result.success && result.error) {
							throw Error(result.error);
						}
						if (result.warning) {
							await this.sendAdminMessage({
								content: `Encountered problems processing un-whitelist request for ${oldUsername} (username change) on ${server.name}: ${result.warning}`
							}, mcGuildConfig);
						}
					} catch (e) {
						const errorMessage = e instanceof Error ? e.message : 'unknown error';
						await this.sendAdminMessage({
							content: `Encountered error processing un-whitelist request for ${oldUsername} on ${server.name}: ${errorMessage}`
						}, mcGuildConfig);
					}
				}
			}

			await playerRepo.remove(existingPlayerByDiscord);
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

		let problems = false;
		for (const server of servers) {
			try {
				if (server.needsSync) {
					await this.syncServer(server, guild);
				} else {
					const result = await whitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, username);
					if (result.warning) {
						await this.sendAdminMessage({
							content: `Encountered problems processing whitelist request for ${username} on ${server.name}: ${result.warning}`
						}, mcGuildConfig);
						this.bot.logger.warn(`Warning while whitelisting ${username} on ${server.name}: ${result.warning}`);
					}
					if (!result.success) {
						throw Error(result.error);
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

	private async checkAdmin(guild: Guild, member: Discord.GuildMember, mcGuildConfig?: MinecraftGuildConfig): Promise<boolean> {
		if (this.adminCog.isManagerOnServer(member)) {
			return true;
		}

		if (mcGuildConfig && mcGuildConfig.adminChannelId) {
			const channel = await guild.channels.fetch(mcGuildConfig.adminChannelId);
			if (channel && channel.isText()) {
				return this.adminCog.isModOnChannel(channel, member.user);
			}
		}
		return false;
	}

	private async commandAdminSetWhitelistRole(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember,,,mcGuildConfig] = await this.resolveGuildMembership(interaction);
		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
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

	private async commandAdminSetAdminChannel(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember, ,] = await this.resolveGuildMembership(interaction);
		if (!this.adminCog.isManagerOnServer(guildMember)) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}
		const channel = interaction.options.getChannel('channel', false);
		const guildConfigRepo = this.manager.getRepository(MinecraftGuildConfig);
		let guildConfig = await guildConfigRepo.findOne({ where: { guildId: guild.id } });
		if (!guildConfig) {
			guildConfig = new MinecraftGuildConfig();
			guildConfig.guildId = guild.id;
		}
		if (!channel) {
			guildConfig.adminChannelId = null;
			await guildConfigRepo.save(guildConfig);
			await interaction.reply({
				content: 'Cleared admin channel; no admin channel is set',
				ephemeral: true
			});
		} else {
			guildConfig.adminChannelId = channel.id;
			await guildConfigRepo.save(guildConfig);
			await interaction.reply({
				content: `Set admin channel to #${channel.name}`,
				ephemeral: true
			});

			const guildChannel = await this.bot.client.channels.fetch(channel.id);
			guildChannel?.isText() && await guildChannel.send({
				content: 'This channel has been set as the admin channel for the Minecraft cog. Users with the "Manage Messages" permission on this channel can now invoke /minecraftadmin commands.'
			});
		}
	}

	private async commandAdminBlockPlayer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember,,,mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
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
		} else if (minecraftPlayer.blocked) {
			await interaction.reply({
				content: 'This user is already blocked',
				ephemeral: true
			});
			return;
		}

		minecraftPlayer.blocked = true;
		await minecraftPlayerRepo.save(minecraftPlayer);
		await interaction.deferReply({
			ephemeral: true
		});
		if (minecraftPlayer.minecraftUsername && minecraftPlayer.minecraftUuid) {
			const serverRepo = this.manager.getRepository(MinecraftServer);
			const servers = await serverRepo.find({ where: { guildId: guild.id, managedWhitelist: true, enabled: true } });
			for (const server of servers) {
				try {
					const result = await unwhitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, minecraftPlayer.minecraftUsername, true);
					if (result.warning) {
						await this.sendAdminMessage({
							content: `Encountered problems while unwhitelisting player ${minecraftPlayer.minecraftUsername} (processing a block command) on ${server.name}: ${result.warning}`,
						}, mcGuildConfig);
						this.bot.logger.warn(`Warning while unwhitelisting ${minecraftPlayer.minecraftUsername} on ${server.name}: ${result.warning}`);
					}
					if (!result.success) {
						throw Error(result.error);
					}
				} catch (e) {
					const errorMessage = e instanceof Error ? e.message : 'unknown error';
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					this.bot.logger.warn(`Failed to unwhitelist player ${minecraftPlayer.minecraftUsername}`, { err: e });
					await this.sendAdminMessage({
						content: `Encountered problems while unwhitelisting player ${minecraftPlayer.minecraftUsername} (processing a block command) on ${server.name}: ${errorMessage}`,
					}, mcGuildConfig);
					server.needsSync = true;
					await serverRepo.save(server);
				}
			}
		}
		await interaction.editReply({
			content: 'User has been blocked'
		});
	}

	private async commandAdminUnblockPlayer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember,,, mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
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
			await interaction.deferReply({
				ephemeral: true
			});
			const serverRepo = this.manager.getRepository(MinecraftServer);
			const servers = await serverRepo.find({ where: { guildId: guild.id, managedWhitelist: true, enabled: true } });
			for (const server of servers) {
				try {
					const result = await whitelistPlayer(server.rconHost, server.rconPort, server.rconPassword, minecraftPlayer.minecraftUsername);
					if (result.warning) {
						await this.sendAdminMessage({
							content: `Encountered problems while whitelisting player ${minecraftPlayer.minecraftUsername} (processing an unblock command) on ${server.name}: ${result.warning}`,
						}, mcGuildConfig);

						this.bot.logger.warn(`Warning while whitelisting ${minecraftPlayer.minecraftUsername} on ${server.name}: ${result.warning}`);
					}
					if (!result.success) {
						throw Error(result.error);
					}
				} catch (e) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					this.bot.logger.warn('Failed to unwhitelist player', { err: e });
					const errorMessage = e instanceof Error ? e.message : 'unknown error';
					await this.sendAdminMessage({
						content: `Encountered problems while whitelisting player ${minecraftPlayer.minecraftUsername} (processing an unblock command) on ${server.name}: ${errorMessage}`,
					}, mcGuildConfig);
					problems = true;
					server.needsSync = true;
					await serverRepo.save(server);
				}
			}
		}

		await interaction.editReply({
			content: problems ? 'User has been restored, but re-whitelisting failed on one or more servers' : 'User has been restored'
		});
	}

	private async commandAdminAddServer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember,,, mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}
		this.utilCog.voidReply(interaction);

		// Check for duplicate name
		const serverRepo = this.manager.getRepository(MinecraftServer);
		const existingServer = await serverRepo.findOne({ where: { guildId: guild.id, name: interaction.options.getString('name', true) } });
		if (existingServer) {
			await interaction.channel?.send({
				content: `<@${interaction.user.id}> A server with that name already exists`
			});
			return;
		}

		const server = new MinecraftServer();
		server.guildId = guild.id;
		server.name = interaction.options.getString('name', true);
		server.rconHost = interaction.options.getString('rcon-host', true);
		server.rconPort = interaction.options.getInteger('rcon-port', true);
		server.rconPassword = interaction.options.getString('rcon-password', true);
		server.managedWhitelist = interaction.options.getBoolean('whitelist-managed', true);
		server.enabled = true;

		try {
			// Run an rcon command just to make sure everything works
			await getWhitelistedUsernames(server.rconHost, server.rconPort, server.rconPassword);
		} catch (e) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			this.bot.logger.warn('Encountered error when validating RCON for new server', { err: e });
			await interaction.channel?.send({
				content: `<@${interaction.user.id}> Invalid or incorrect RCON configuration`,
			});
			return;
		}

		await serverRepo.save(server);
		await this.syncServer(server, guild);
		await interaction.channel?.send({
			content: `<@${interaction.user.id}> Server added`,
		});
	}

	private async commandAdminListServers(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember, , , mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}

		const serverRepo = this.manager.getRepository(MinecraftServer);
		const servers = await serverRepo.find({ where: { guildId: guild.id } });
		if (servers.length === 0) {
			await interaction.reply({
				content: 'There are no servers configured for this guild',
				ephemeral: true
			});
			return;
		}

		const embed = new Discord.MessageEmbed();
		embed.setTitle('Minecraft Servers');
		for (const server of servers) {
			embed.addFields({ name: 'Server Name', value: server.name, inline: true });
			embed.addFields({ name: 'Enabled?', value: server.enabled ? 'Yes' : 'No', inline: true });
			embed.addFields({ name: 'Managed Whitelist?', value: server.managedWhitelist ? 'Yes' : 'No', inline: true });
		}
		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		});
	}

	private async commandAdminModifyServer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember, , , mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}

		const serverName = interaction.options.getString('server', true);
		const serverRepo = this.manager.getRepository(MinecraftServer);
		const server = await serverRepo.findOne({ where: { guildId: guild.id, name: serverName } });
		if (!server) {
			await interaction.reply({
				content: 'Server not found',
				ephemeral: true
			});
			return;
		}
		let voidedReply = false;
		const rconHost = interaction.options.getString('rcon-host', false);
		const rconPort = interaction.options.getInteger('rcon-port', false);
		const rconPassword = interaction.options.getString('rcon-password', false);
		const managedWhitelist = interaction.options.getBoolean('whitelist-managed', false);
		const enabled = interaction.options.getBoolean('enabled', false);

		if (rconPassword) {
			voidedReply = true;
			this.utilCog.voidReply(interaction);
			server.rconPassword = rconPassword;
		}

		if (rconHost) server.rconHost = rconHost;
		if (rconPort) server.rconPort = rconPort;
		if (managedWhitelist !== undefined && managedWhitelist !== null) server.managedWhitelist = managedWhitelist;
		if (enabled !== undefined && enabled !== null) server.enabled = enabled;
		await serverRepo.save(server);

		if (voidedReply) {
			await interaction.channel?.send({
				content: `<@${interaction.user.id}> Server updated`,
			});
		} else {
			await interaction.reply({
				content: `Server updated`,
				ephemeral: true
			});
		}
	}

	private async commandAdminDeleteServer(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember,,, mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}

		const serverName = interaction.options.getString('name', true);
		const serverRepo = this.manager.getRepository(MinecraftServer);
		const server = await serverRepo.findOne({ where: { guildId: guild.id, name: serverName } });
		if (!server) {
			await interaction.reply({
				content: 'Server not found',
				ephemeral: true
			});
			return;
		}
		await serverRepo.delete(server);
		await interaction.reply({
			content: 'Server deleted',
			ephemeral: true
		});
	}

	private async commandAdminSync(interaction: Discord.CommandInteraction): Promise<void> {
		const [guild, guildMember,,, mcGuildConfig] = await this.resolveGuildMembership(interaction);

		if (!(await this.checkAdmin(guild, guildMember, mcGuildConfig))) {
			await interaction.reply({
				content: 'You do not have permission to use this command',
				ephemeral: true
			});
			return;
		}
		const serverName = interaction.options.getString('server', true);
		const serverRepo = this.manager.getRepository(MinecraftServer);
		const server = await serverRepo.findOne({ where: { guildId: guild.id, managedWhitelist: true, enabled: true, name: serverName } });
		if (!server) {
			const validServerNames = (await serverRepo.find({ where: { guildId: guild.id, managedWhitelist: true, enabled: true } })).map(s => s.name);
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