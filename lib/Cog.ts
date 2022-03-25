import Discord from 'discord.js';
import { Bot } from "./Bot";

export abstract class Cog {
	bot: Bot;
	abstract requires: string[];

	constructor(bot: Bot) {
		this.bot = bot;
	}
	setup() {
		return;
	}
	preinit() {
		return;
	}
	ready()
	{
		return;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	newGuild(guild: Discord.Guild) {
		return;
	}
	// shutdown() {
	// 	this.bot = null;
	// }
}