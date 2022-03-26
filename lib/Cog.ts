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
	async postSetup():Promise<void> {
		return;
	}
	async ready():Promise<void>
	{
		return;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async newGuild(guild: Discord.Guild):Promise<void> {
		return;
	}
	async shutdown():Promise<void> {
		this.bot = null;
	}
}