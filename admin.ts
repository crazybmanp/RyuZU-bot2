/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// TODO: Get rid of this disable
import Discord from 'discord.js';
import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';

export class adminCog extends Cog {
	requires: string[] = [];
	cogName: string = 'admin';

	setup(): void {
		this.bot.registerCommand('say', this.say.bind(this));
		// bot.registerCommand('clean', clean);
		// bot.registerCommand('clear', clean);
		// bot.registerCommand('purge', purge);
		this.bot.registerCommand('issue', this.issue.bind(this));
		this.bot.registerCommand('issues', this.issue.bind(this));
	}

	private isOwner (author: Discord.User): boolean {
		const fullname: string = author.username + '#' + author.discriminator;
		for (let i = 0; i < this.bot.config.owners.length; i++) {
			const owner: string = this.bot.config.owners[i];
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

	public isModOnChannel(channel: Discord.GuildChannel, author: Discord.User): boolean {
		return this.hasPermOnChannel('MANAGE_MESSAGES', channel, author);
	}

	public hasPermOnServer(perm: Discord.PermissionString, author: Discord.GuildMember): boolean {
		return author.permissions.has('MANAGE_MESSAGES');
	}

	public hasPermOnChannel(perm: Discord.PermissionString, channel: Discord.GuildChannel, author: Discord.User): boolean {
		const perms = channel.permissionsFor(author);
		return perms.has('MANAGE_MESSAGES');
	}

	async say(msg: Discord.Message): Promise<void> {
		await msg.delete();
		msg.channel.send(msg.content)
			.catch( (err) => {
				this.bot.logger.error('Error sending a message', { err });
				msg.channel.send('I can\'t say that for some reason')
					.catch( (err2) => {
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

	issue(msg: Discord.Message): void {
		void msg.reply('Here is a link to my issues page on my github, please report any issues here: ' + this.bot.config.issuesPage);
	}
}

export default (bot: Bot): adminCog => {return new adminCog(bot);}