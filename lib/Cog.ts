import Discord from 'discord.js';
import { Bot } from './Bot';

export abstract class Cog {
	bot: Bot;
	abstract requires: string[];
	abstract cogName: string;

	constructor(bot: Bot) {
		this.bot = bot;
	}
	setup(): Promise<void>|void{
		return;
	}
	postSetup():Promise<void>|void {
		return;
	}
	ready():Promise<void>|void
	{
		return;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	newGuild(guild: Discord.Guild):Promise<void>|void {
		return;
	}
	shutdown():Promise<void>|void {
		this.bot = null;
	}
}