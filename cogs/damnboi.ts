const memeMsg: string = 'oh yeah damn damn boi DAMN BOI HE THICC BOI THAT\'S A THICC ASS BOI DAMN';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import Discord from 'discord.js';
import { Quote } from '../model/Quote';
import { quoteCog } from './quotes';
import { SlashCommandBuilder } from '@discordjs/builders';

class damnboiCog extends Cog {
	requires: string[] = [];
	cogName: string = 'damnboi';

	setup(): void {
		this.bot.registerCommand({
			command: 'damnboi',
			commandBuilder: new SlashCommandBuilder()
				.setName('damnboi')
				.setDescription('Prints a meme'),
			function: this.damn.bind(this),
		})
		this.bot.registerCommand({
			command: 'mix',
			commandBuilder: new SlashCommandBuilder()
				.setName('mix')
				.setDescription('Mixes a string')
				.addStringOption(option => option
					.setName('text')
					.setDescription('The text to mix')
					.setRequired(true)),
			function: this.mix.bind(this),
		});
		this.bot.registerCommand({
			command: 'strokeout',
			commandBuilder: new SlashCommandBuilder()
				.setName('strokeout')
				.setDescription('mixes a quote')
				.addNumberOption(option => option
					.setName('quote')
					.setDescription('The quote id to strokout')
					.setRequired(false)),
			function: this.quotedamn.bind(this),
		});
	}

	public memeMe(text: string): string {
		const arr = text.split(' ');
		this._shuffle(arr);
		return arr.join(' ');
	}

	damn(interaction: Discord.CommandInteraction): void {
		void interaction.reply(this.memeMe(memeMsg));
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

	private constructQuote(quote: Quote): string {
		return `${quote.quoteNumber} (${quote.category}): ${quote.text}`;
	}

	async quotedamn(interaction: Discord.CommandInteraction): Promise<void> {
		let quote;

		const num = interaction.options.getNumber('quote');
		if (num) {
			quote = await this.bot.getCog<quoteCog>('quotes').GiveQuote(interaction.guild, num);
			if (typeof quote === 'undefined') {
				void interaction.reply('Quote not found.');
				return;
			}
		} else {
			quote = await this.bot.getCog<quoteCog>('quotes').GiveQuote(interaction.guild);
		}

		if (quote === null) {
			void interaction.reply('Quote not found.');
			return;
		}

		quote.text = this.memeMe(quote.text);
		void interaction.reply(this.constructQuote(quote));
	}

	mix(msg: Discord.CommandInteraction): void {
		void msg.reply(this.memeMe(msg.options.getString('text')));
	}
}

export default (bot: Bot): damnboiCog => { return new damnboiCog(bot); }