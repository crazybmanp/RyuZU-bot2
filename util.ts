import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';
import Discord, { CommandInteraction } from 'discord.js';

export class utilCog extends Cog {
	requires: string[] = [];
	cogName: string = 'util';

	voidReply(interaction: CommandInteraction): void {
		void interaction.deferReply().then(void interaction.deleteReply());
	}

	async printLong(channel: Discord.TextChannel, items: string[]): Promise<void> {
		const messageList = [];
		let curMessage = '';
		for (let i = 0; i < items.length; i++) {
			if (curMessage.length + items[i].length > 2000) {
				messageList.push(curMessage);
				curMessage = '';
			}
			curMessage += items[i] + '\n';
		}
		messageList.push(curMessage);

		for (let i = 0; i < messageList.length; i++) {
			await channel.send(messageList[i]);
		}
	}
}

export default (bot: Bot): utilCog => {return new utilCog(bot);}