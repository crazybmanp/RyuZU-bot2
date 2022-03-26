const memeMsg: string = 'oh yeah damn damn boi DAMN BOI HE THICC BOI THAT\'S A THICC ASS BOI DAMN';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
class damnboiCog extends Cog {
	requires = [];
	cogName: string = 'damnboi';

	setup() {
		this.bot.memeMe = this.memeMe;
		this.bot.registerCommand('damnboi', this.damn);
		this.bot.registerCommand('mix', this.mix);
		this.bot.registerCommand('damnquote', this.quotedamn);
		this.bot.registerCommand('strokeout', this.quotedamn);
		this.bot.registerCommand('sromkoot', this.quotedamn);
		this.bot.registerCommand('stronkout', this.quotedamn);
	}

	memeMe(msg) {
		const arr = msg.toString().split(' ');
		this._shuffle(arr);
		return arr.join(' ');
	}

	damn(msg) {
		msg.channel.send(this.memeMe(memeMsg));
	}

	// Shamelessly stolen from stack overflow
	_shuffle(array) {
		let currentIndex = array.length,
			temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	constructQuote(quote) {
		return quote.id + '(' + quote.category + '): ' + quote.quote;
	}

	printQuote(msg, quote) {
		msg.channel.send(this.constructQuote(quote));
	}

	quotedamn(msg) {
		let q;
		if (msg.content.length > 0) {
			const num: number = parseInt(msg.content);
			if (isNaN(num)) {
				msg.reply('You need to give a quote number in order to get a quote');
				return;
			}
			q = this.bot.giveQuote(msg.guild, num);
			if (typeof q === 'undefined') {
				msg.reply('Quote not found.');
				return;
			}
		} else {
			q = this.bot.giveQuote(msg.guild);
		}
		q.quote = this.memeMe(q.quote);
		this.printQuote(msg, q);
	}

	mix(msg) {
		msg.channel.send(this.memeMe(msg.content));
	}
}

export default (bot: Bot) => {return new damnboiCog(bot);}