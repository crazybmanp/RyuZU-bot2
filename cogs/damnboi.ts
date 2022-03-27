const memeMsg: string = 'oh yeah damn damn boi DAMN BOI HE THICC BOI THAT\'S A THICC ASS BOI DAMN';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import Discord from 'discord.js';
import { Quote } from '../model/Quote';

class damnboiCog extends Cog {
	requires: string[] = [];
	cogName: string = 'damnboi';

	setup(): void {
		this.bot.memeMe = this.memeMe.bind(this);
		this.bot.registerCommand('damnboi', this.damn.bind(this));
		this.bot.registerCommand('mix', this.mix.bind(this));
		this.bot.registerCommand('damnquote', this.quotedamn.bind(this));
		this.bot.registerCommand('strokeout', this.quotedamn.bind(this));
		this.bot.registerCommand('sromkoot', this.quotedamn.bind(this));
		this.bot.registerCommand('stronkout', this.quotedamn.bind(this));
	}

	memeMe(msg: string): string {
		const arr = msg.split(' ');
		this._shuffle(arr);
		return arr.join(' ');
	}

	damn(msg: Discord.Message): void {
		void msg.channel.send(this.memeMe(memeMsg));
	}

	// Shamelessly stolen from stack overflow
	_shuffle(array: unknown[]): unknown[] {
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

	private constructQuote(quote:Quote): string {
		return `${quote.quoteNumber} (${quote.category}): ${quote.text}`;
	}

	private printQuote(msg: Discord.Message, quote: Quote): void {
		void msg.channel.send(this.constructQuote(quote));
	}

	async quotedamn(msg: Discord.Message): Promise<void> {
		let q;
		if (msg.content.length > 0) {
			const num: number = parseInt(msg.content);
			if (isNaN(num)) {
				void msg.reply('You need to give a quote number in order to get a quote');
				return;
			}
			q = (await this.bot.giveQuote(msg.guild, num) as Quote);
			if (typeof q === 'undefined') {
				void msg.reply('Quote not found.');
				return;
			}
		} else {
			q = (await this.bot.giveQuote(msg.guild) as Quote);
		}

		if (q === null) {
			void msg.reply('Quote not found.');
			return;
		}

		q.text = this.memeMe(q.text);
		this.printQuote(msg, q);
	}

	mix(msg: Discord.Message): void {
		void msg.channel.send(this.memeMe(msg.content));
	}
}

export default (bot: Bot): damnboiCog => {return new damnboiCog(bot);}