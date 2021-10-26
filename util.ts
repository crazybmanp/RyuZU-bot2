import { Bot } from './app';

let bot: Bot;

let printLong = function (channel, items) {
		let messageList = [];
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
};

let setup = function (b) {
		bot = b;
		bot.printLong = printLong;
};

exports.requires = [];
exports.setup = setup;