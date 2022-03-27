import Discord, { GuildChannel, TextChannel } from 'discord.js';
import { EntityManager } from 'typeorm';
import { adminCog } from '../admin';
import { databaseCog } from '../database';
import { Bot, CommandFunction } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import { IDatabaseConsumer } from '../lib/IDatabaseConsumer';
import { Quote } from '../model/Quote';
import { QuoteNumber } from '../model/QuoteNumber';
import { utilCog } from '../util';

export class quoteCog extends Cog implements IDatabaseConsumer {
	requires: string[] = ['./database.js', './util.js'];
	cogName: string = 'quotes';

	private subcommands: { [key: string]: CommandFunction } = {};
	private manager: EntityManager;
	private databaseCog: databaseCog;

	constructor(bot: Bot) {
		super(bot);

		this.subcommands = {
			'random': (this.commandRandomQuote.bind(this) as CommandFunction),
			'list': (this.listQuote.bind(this) as CommandFunction),
			'get': (this.getQuote.bind(this) as CommandFunction),
			'give': (this.getQuote.bind(this) as CommandFunction),
			'delete': (this.commandDeleteQuote.bind(this) as CommandFunction),
			'remove': (this.commandDeleteQuote.bind(this) as CommandFunction),
			'add': (this.addQuote.bind(this) as CommandFunction)
		};
	}

	getModels(): unknown[] {
		return [Quote, QuoteNumber];
	}

	giveManager(manager: EntityManager, database: databaseCog): void {
		this.manager = manager;
		this.databaseCog = database;
	}
	shutdownManager(): void {
		this.manager = undefined;
	}

	setup():void {
		this.bot.registerCommand('quote', this.quoteHandler.bind(this));
		this.bot.getCog<databaseCog>('database').registerCog(this);
	}

	public async GiveQuote(guild: Discord.Guild, num: number = undefined): Promise<Quote> {
		let ret: Quote;
		if (num) {
			ret = await this.getQuoteById(num);
		} else {
			ret = await this.randomQuote(guild);
		}

		return (JSON.parse(JSON.stringify(ret)) as Quote);
	}

	private async getCategories(guild: Discord.BaseGuild): Promise<string[]> {
		const results = await this.manager.createQueryBuilder(Quote, 'quote')
			.select('quote.category')
			.where('quote.guild = :guild', { guild: guild.id })
			.distinct()
			.getMany();
		return results.map((x) => x.category);
	}

	private async isCategory(guild: Discord.Guild, category: string): Promise<boolean> {
		return (await this.getCategories(guild)).includes(category);
	}

	private constructQuote(quote:Quote): string {
		return `${quote.quoteNumber} (${quote.category}): ${quote.text}`;
	}

	private printQuote(msg: Discord.Message, quote: Quote): void {
		void msg.channel.send(this.constructQuote(quote));
	}

	private async randomQuote(guild: Discord.Guild, category:string = undefined): Promise<Quote>{
		const quote = this.manager.createQueryBuilder(Quote, 'quote')
			.where('quote.guild = :guild', { guild: guild.id })
			.orderBy('RANDOM()')
		if (category) {
			quote.andWhere('quote.category = :category', { category: category });
		}
		return quote.getOne();
	}

	private async getQuoteById(id: number):Promise<Quote|null> {
		return this.manager.findOneBy(Quote, { id: id });
	}

	private async getQuoteByNumber(guild: Discord.Guild, quoteNumber: number): Promise<Quote|null> {
		return this.manager.findOne(Quote, {where:{ guildId: guild.id, quoteNumber: quoteNumber }});
	}

	private async getAllQuotes(guild: Discord.Guild, category:string = undefined): Promise<(Quote|null)[]> {
		if (category) {
			return this.manager.find(Quote, { where: { guildId: guild.id, category: category } });
		} else {
			return this.manager.find(Quote, { where: { guildId: guild.id } });
		}
	}

	private async saveQuote(quote: Quote): Promise<void> {
		await this.manager.save(quote);
	}

	private async deleteQuote(quote: Quote): Promise<void> {
		await this.manager.remove(quote);
	}

	private async commandRandomQuote(msg: Discord.Message): Promise<void> {
		let cat = '';
		if (msg.content.length > 0) {
			cat = msg.content.split(' ')[0];
			if (!await this.isCategory(msg.guild, cat)) {
				void msg.reply('Not a valid category.');
				return;
			}
		}
		const quote = await this.randomQuote(msg.guild, cat);
		if (!quote) {
			await msg.reply('This server has no quotes.');
			return;
		}
		this.printQuote(msg, quote);
	}

	private async listQuote(msg: Discord.Message): Promise<void> {
		let category: string = '';
		if (msg.content.length > 0) {
			category = msg.content.split(' ')[0];
			if (!await this.isCategory(msg.guild, category)) {
				void msg.reply('Not a valid category.');
				return;
			}
		}

		const quotes = await this.getAllQuotes(msg.guild, category);

		const quoteText: string[] = quotes.map((x) => this.constructQuote(x));

		if (quoteText.length < 1) {
			void msg.reply('found no quotes...');
			return;
		}

		void this.bot.getCog<utilCog>('util').printLong((msg.channel as TextChannel), quoteText);
	}

	private async getQuote(msg: Discord.Message): Promise<void> {
		const num: number = parseInt(msg.content);
		if (isNaN(num)) {
			void msg.reply('You need to give a quote number in order to get a quote');
			return;
		}
		const quote = await this.getQuoteByNumber(msg.guild, num);

		if(!quote) {
			void msg.reply('Quote not found.');
			return;
		}
		this.printQuote(msg, quote);
	}

	private async commandDeleteQuote(msg: Discord.Message): Promise<void> {
		if (!this.bot.getCog<adminCog>('admin').isModOnChannel((msg.channel as GuildChannel), msg.author)) {
			void msg.reply('You are not allowed to do that');
		}
		const num: number = parseInt(msg.content);
		if (isNaN(num)) {
			void msg.reply('You need to give a quote number in order to get a quote');
			return;
		}

		const quote = await this.getQuoteByNumber(msg.guild, num);

		if (typeof quote === 'undefined') {
			void msg.reply('Quote not found.');
			return;
		}

		const copy = (JSON.parse(JSON.stringify(quote)) as Quote);

		await this.deleteQuote(quote);

		await msg.reply('Quote removed: ');
		this.printQuote(msg, copy);
	}

	private async addQuote(msg: Discord.Message): Promise<void> {
		const splt = msg.content.split('"');
		const supersplit: string[][] = [];
		splt.forEach(function (element) {
			supersplit.push(element.split(' '));
		}, this);
		supersplit.forEach(function (element: string[], i: number, arr: string[][]) {
			arr[i] = element.filter(Boolean);
		}, this);

		if (supersplit.length < 2) {
			void msg.reply('Usage: specify the quote in quotations, with one word before or after to specify its category');
			return;
		}
		if (supersplit[0].length + supersplit[2].length > 1) {
			void msg.reply('Usage: specify the quote in quotations, with one word before or after to specify its category');
			return;
		}

		let category = '';
		if (supersplit[0].length === 1) {
			category = supersplit[0][0];
		} else {
			category = supersplit[2][0];
		}

		const quoteText = supersplit[1].join(' ');

		let quote;

		await this.manager.transaction(async (tm) => {
			let nextNumber = await tm.findOneBy(QuoteNumber, { guildId: msg.guild.id });
			if (!nextNumber) {
				nextNumber = new QuoteNumber();
				nextNumber.guildId = msg.guild.id;
				nextNumber.nextQuoteNumber = 1;
			}

			quote = new Quote();
			quote.quoteNumber = nextNumber.nextQuoteNumber;
			quote.guildId = msg.guild.id;
			quote.text = quoteText;
			quote.category = category;
			quote.creator = await this.databaseCog.findOrGetUser(msg.author.id, msg.guild.id);

			await tm.save(quote);

			nextNumber.nextQuoteNumber++;
			await tm.save(nextNumber);
		})

		await msg.reply('Quote added:');
		this.printQuote(msg, quote);
	}

	private async quoteHandler(msg: Discord.Message): Promise<void> {
		let command = msg.content.split(' ')[0];
		msg.content = msg.content.substr(command.length + 1, msg.content.length);
		if (command === '') {
			command = 'random';
		}
		const fn: CommandFunction = this.subcommands[command];
		if (typeof fn === 'function') {
			await fn(msg);
		} else {
			void msg.reply('Cannot find subcommand... [' + command + ']');
		}
	}
}

export default (bot: Bot): quoteCog => {return new quoteCog(bot);}