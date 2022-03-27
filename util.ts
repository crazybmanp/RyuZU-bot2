/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// TODO: make this no longer needed
import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';
import Discord from 'discord.js';

export class utilCog extends Cog {
	requires: string[] = [];
	cogName: string = 'util';

	async printLong(channel: Discord.TextChannel, items: string[]): Promise<void> {
		const messageList = [];
		let curMessage = '';
		for (let i = 0; i < items.length; i++) {
			if (curMessage.length + items[i].length > 2000) {
				messageList.push(curMessage);
				curMessage = '';
			}
			curMessage += items[i];
		}
		messageList.push(curMessage);

		for (let i = 0; i < messageList.length; i++) {
			await channel.send(messageList[i]);
		}
	}
}

export default (bot: Bot): utilCog => {return new utilCog(bot);}