import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';
import Discord, { CommandInteraction } from 'discord.js';

export class utilCog extends Cog {
	requires: string[] = [];
	cogName: string = 'util';

	voidReply(interaction: CommandInteraction): void {
		void interaction.deferReply().then(void interaction.deleteReply());
	}

	async printLong(channel: Discord.TextChannel, items: string[], safety = 60): Promise<void> {
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

    let messages = messageList.length;
    let hitSafety = false;
    if(messageList.length > safety) {
        messages = safety;
        hitSafety = true;
        this.bot.logger.warn(`Hit safety limit of ${safety} messages, sending ${messageList.length} messages.`);
    }

		for (let i = 0; i < messages; i++) {
			await channel.send(messageList[i]);
		}
    if(hitSafety) {
      await channel.send('This message has been truncated due to excessive length. Sorry.');
    }
	}
}

export default (bot: Bot): utilCog => {return new utilCog(bot);}