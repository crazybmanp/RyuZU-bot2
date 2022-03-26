import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';

class utilCog extends Cog {
	requires: string[] = [];
	cogName: string = 'util';

	printLong(channel, items) {
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
			channel.send(messageList[i]);
		}
	}

	setup() {
		this.bot.printLong = this.printLong;
	}
}

export default (bot: Bot) => {return new utilCog(bot);}