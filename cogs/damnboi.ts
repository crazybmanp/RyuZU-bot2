const memeMsg: string = 'oh yeah damn damn boi DAMN BOI HE THICC BOI THAT\'S A THICC ASS BOI DAMN';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import Discord from 'discord.js';
import { Quote } from '../model/Quote';
import { quoteCog } from './quotes';

class damnboiCog extends Cog {
	requires: string[] = [];
	cogName: string = 'damnboi';

	setup(): void {
		this.bot.registerCommand('damnboi', this.damn.bind(this));
		this.bot.registerCommand('mix', this.mix.bind(this));
		this.bot.registerCommand('damnquote', this.quotedamn.bind(this));
		this.bot.registerCommand('strokeout', this.quotedamn.bind(this));
		this.bot.registerCommand('sromkoot', this.quotedamn.bind(this));
		this.bot.registerCommand('stronkout', this.quotedamn.bind(this));
	}

	public memeMe(text: string): string {
		const arr = text.split(' ');
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
		let quote;
		if (msg.content.length > 0) {
			const num: number = parseInt(msg.content);
			if (isNaN(num)) {
				void msg.reply('You need to give a quote number in order to get a quote');
				return;
			}
			quote = await this.bot.getCog<quoteCog>('quote').GiveQuote(msg.guild, num);
			if (typeof quote === 'undefined') {
				void msg.reply('Quote not found.');
				return;
			}
		} else {
			quote = await this.bot.getCog<quoteCog>('quote').GiveQuote(msg.guild);
		}

		if (quote === null) {
			void msg.reply('Quote not found.');
			return;
		}

		quote.text = this.memeMe(quote.text);
		this.printQuote(msg, quote);
	}

	mix(msg: Discord.Message): void {
		void msg.channel.send(this.memeMe(msg.content));
	}
}

export default (bot: Bot): damnboiCog => {return new damnboiCog(bot);}