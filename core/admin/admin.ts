import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, { GuildChannel } from 'discord.js';
import { Bot } from '../../lib/Bot';
import { Cog } from '../../lib/Cog';
import { utilCog } from '../util/util';

export class adminCog extends Cog {
	requires: string[] = [];
	cogName: string = 'admin';

	setup(): void {
		this.bot.registerCommand({
			command: 'say',
			commandBuilder: new SlashCommandBuilder()
				.setName('say')
				.setDescription('Sends a message in the channel')
				.addStringOption(option => option.setName('message')
					.setRequired(true)
					.setDescription('The message to send')
				)
				.addChannelOption(option => option.setName('channel')
					.setRequired(false)
					.setDescription('The channel to send the message in')
					.addChannelType(0)
				)
			,
			function: this.say.bind(this)
		})

		this.bot.registerCommand({
			command: 'issue',
			commandBuilder: new SlashCommandBuilder()
				.setName('issue')
				.setDescription('Sends a link to the issues page'),
			function: this.issue.bind(this)
		});
		// bot.registerCommand('clean', clean);
		// bot.registerCommand('purge', purge);
	}

	private isOwner(author: Discord.User): boolean {
		const fullname: string = author.username + '#' + author.discriminator;

		const owners = this.bot.config.owners;
		for (let i = 0; i < owners.length; i++) {
			const owner: string = owners[i];
			if (owner === fullname) {
				return true;
			}
		}
		return false;
	}

	public isManagerOnServer(author: Discord.GuildMember): boolean {
		return this.hasPermOnServer('MANAGE_GUILD', author);
	}

	public isModOnServer(author: Discord.GuildMember): boolean {
		return this.hasPermOnServer('MANAGE_MESSAGES', author);
	}

	public isModOnChannel(channel: Discord.GuildChannel | Discord.TextChannel | Discord.NewsChannel | Discord.ThreadChannel, author: Discord.User): boolean {
		return this.hasPermOnChannel('MANAGE_MESSAGES', channel, author);
	}

	public hasPermOnServer(perm: Discord.PermissionString, author: Discord.GuildMember): boolean {
		return author.permissions.has(perm);
	}

	public hasPermOnChannel(perm: Discord.PermissionString, channel: Discord.GuildChannel | Discord.TextChannel | Discord.NewsChannel | Discord.ThreadChannel, author: Discord.User): boolean {
		const perms = channel.permissionsFor(author);
		return perms?.has(perm) ?? false;
	}

	async say(interaction: Discord.CommandInteraction): Promise<void> {
		if (!interaction.channel || !this.isModOnChannel(((await interaction.channel.fetch()) as GuildChannel), interaction.user)) {
			void interaction.reply('You do not have permission to use this command');
			return; //The check here should be cleaned up.
		}

		this.bot.getCog<utilCog>('util').voidReply(interaction);

		const ch = interaction.options.getChannel('channel');

		let channel = interaction.channel
		if (ch) {
			const newch = interaction.guild?.channels?.resolve(ch.id);
			if (newch) {
				if (!newch.isText()) {
					void interaction.reply('That channel is not a text channel.');
					return;
				} else if (!this.isModOnChannel(newch, interaction.user)) {
					void interaction.reply('You do not have permission to use this command');
					return;
				}
				channel = newch;
			} else {
				this.bot.logger.error('Channel specified is not in a guilad', { cog: 'admin', command: 'say' });
			}
		}

		const msg = interaction.options.getString('message');
		if (!msg) {
			void interaction.reply('You must specify a message to send.');
			return;
		}

		channel.send(msg)
			.catch((err: unknown) => {
				this.bot.logger.error('Error sending a message', { err });
				if (!interaction.channel) {
					this.bot.logger.error('No interaction channel', { cog: 'admin', command: 'say' });
					return;
				}
				interaction.channel.send('I can\'t say that for some reason')
					.catch((err2: unknown) => {
						this.bot.logger.error('Error sending message saying we had an error sending a message', { err2 });
					});
			});
	}

	// const clean = function (msg: Message) {
	// 	const lim: number = parseInt(msg.content);
	// 	msg.channel.fetchMessages({
	// 		limit: isNaN(lim) ? 100 : lim
	// 	})
	// 		.then(function (messages) {
	// 			messages = messages.filter(function (s) {
	// 				return (s.author.id === bot.client.user.id || s.content.startsWith(bot.config.commandString));
	// 			});
	// 			msg.channel.bulkDelete(messages);
	// 			msg.reply('Deleted ' + messages.size + ' messages.');
	// 		})
	// 		.catch(function (err) {
	// 			bot.logger.error('Error fetching messages', { err });
	// 		});
	// };

	// const purge = async function (msg: Message) {
	// 	if (bot.isMod(msg.channel, msg.author)) {
	// 		const lim: number = parseInt(msg.content) + 1;
	// 		if (isNaN(lim)) {
	// 			msg.reply('You need to specify a number of messages to purge.');
	// 			return;
	// 		}
	// 		const messages = await msg.channel.fetchMessages({
	// 			limit: lim
	// 		});
	// 		msg.channel.bulkDelete(messages);
	// 		msg.reply('Deleted ' + messages.size + ' messages.');
	// 	} else {
	// 		msg.reply('You are not allowed to do that');
	// 	}
	// };

	issue(interaction: Discord.CommandInteraction): void {
		void interaction.reply('Here is a link to my issues page on my github, please report any issues here: ' + this.bot.config.issuesPage);
	}
}

export default (bot: Bot): adminCog => { return new adminCog(bot); }