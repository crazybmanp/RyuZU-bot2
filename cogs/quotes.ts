import Discord from 'discord.js';
import { EntityManager } from 'typeorm';
import { databaseCog } from '../database';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import { IDatabaseConsumer } from '../lib/IDatabaseConsumer';
import { Quote } from '../Model/Quote';
import { QuoteNumber } from '../Model/QuoteNumber';

class quoteCog extends Cog implements IDatabaseConsumer {
	requires: string[] = ['./database.js', './util.js'];
	cogName: string = 'quotes';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private serverDb: any = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private subcommands: any = {};
	private manager: EntityManager;
	private databaseCog: databaseCog;

	constructor(bot: Bot) {
		super(bot);

		this.subcommands = {
			'random': this.commandRandomQuote.bind(this),
			'list': this.listQuote.bind(this),
			'get': this.getQuote.bind(this),
			'give': this.getQuote.bind(this),
			'delete': this.commandDeleteQuote.bind(this),
			'remove': this.commandDeleteQuote.bind(this),
			'add': this.addQuote.bind(this)
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
		this.bot.giveQuote = this.GiveQuoteSupport.bind(this);
		this.bot.registerCommand('quote', this.quoteHandler.bind(this));
		this.bot.getCog<databaseCog>('database').registerCog(this);
	}

	GiveQuoteSupport(guild, num) {
		const db = this.serverDb[guild.id];
		let ret = {};
		if (num == null) {
			ret = db.get('quotes').shuffle().head().value();
		} else {
			ret = db.get('quotes').find({
				id: num
			}).value();
		}
		return JSON.parse(JSON.stringify(ret));
	}

	private async getCategories(guild: Discord.BaseGuild) {
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

	private async randomQuote(guild: Discord.Guild, category = undefined): Promise<Quote>{
		const quote = this.manager.createQueryBuilder(Quote, 'quote')
			.where('quote.guild = :guild', { guild: guild.id })
			.orderBy('RANDOM()')
		if (category) {
			quote.andWhere('quote.category = :category', { category: category });
		}
		return quote.getOne();
	}

	private async getQuoteById(id: number):Promise<Quote> {
		return this.manager.findOneBy(Quote, { id: id });
	}

	private async getQuoteByNumber(guild: Discord.Guild, quoteNumber: number): Promise<Quote> {
		return this.manager.findOne(Quote, {where:{ guildId: guild.id, quoteNumber: quoteNumber }});
	}

	private async getAllQuotes(guild: Discord.Guild, category:string = undefined): Promise<Quote[]> {
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
		await this.printQuote(msg, quote);
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

		const quoteText: string = quotes.map((x) => this.constructQuote(x)).join('\n');

		if (quoteText.length < 1) {
			void msg.reply('found no quotes...');
			return;
		}

		this.bot.printLong(msg.channel, quoteText);
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
		if (!this.bot.isMod(msg.channel, msg.author)) {
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

		const copy = JSON.parse(JSON.stringify(quote));

		await this.deleteQuote(quote);

		await msg.reply('Quote removed: ');
		await this.printQuote(msg, copy);
	}

	private async addQuote(msg: Discord.Message): Promise<void> {
		const splt = msg.content.split('"');
		const supersplit = [];
		splt.forEach(function (element) {
			supersplit.push(element.split(' '));
		}, this);
		supersplit.forEach(function (element, i, arr) {
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
		await this.printQuote(msg, quote);
	}

	private async quoteHandler(msg) {
		let command = msg.content.split(' ')[0];
		msg.content = msg.content.substr(command.length + 1, msg.content.length);
		if (command === '') {
			command = 'random';
		}
		const fn = this.subcommands[command];
		if (typeof fn === 'function') {
			await fn(msg);
		} else {
			msg.reply('Cannot find subcommand... [' + command + ']');
		}
	}
}

export default (bot: Bot) => {return new quoteCog(bot);}