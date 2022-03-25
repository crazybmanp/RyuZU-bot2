import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';

class quoteCog extends Cog {
	requires: string[] = ['./database.js', './util.js'];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private serverDb: any = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private subcommands: any = {};

	constructor(bot: Bot) {
		super(bot);

		this.subcommands = {
			'random': this.randomQuote,
			'list': this.listQuote,
			'get': this.getQuote,
			'give': this.getQuote,
			'delete': this.deleteQuote,
			'remove': this.deleteQuote,
			'add': this.addQuote
		};
	}

	setup() {
		this.bot.giveQuote = this.GiveQuoteSupport;
		this.bot.registerCommand('quote', this.quoteHandler);
	}

	ready() {
		this.bot.logger.info('Quote - Mounting DBs');
		this.serverDb = this.bot.getAllCogDBs('quotes');
		for (const dbname in this.serverDb) {
			const db = this.serverDb[dbname];
			if (!db.has('quotes').value()) {
				this.bot.logger.info('Setting up new server');
				db.defaults({
					quotes: [],
					nextID: 0
				}).write();
			}
		}
	}

	newGuild(guild) {
		const db = this.bot.getCogDB('quotes', guild.id);
		db.defaults({
			quotes: [],
			nextID: 0
		}).write();
		this.serverDb[guild.id] = db;
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

	private getCategories(db) {
		return db.get('quotes').uniqBy('category').map('category').value();
	}

	private isCategory(db, cat) {
		return this.getCategories(db).indexOf(cat) > -1;
	}

	private constructQuote(quote): string {
		return quote.id + '(' + quote.category + '): ' + quote.quote;
	}

	private printQuote(msg, quote) {
		msg.channel.send(this.constructQuote(quote));
	}

	private randomQuote(msg) {
		const db = this.serverDb[msg.guild.id];
		let val = {};
		if (msg.content.length > 0) {
			const cat = msg.content.split(' ')[0];
			if (!this.isCategory(db, cat)) {
				msg.reply('Not a valid category.');
				return;
			}
			val = db.get('quotes').filter({
				category: cat
			}).shuffle().head().value();
		} else {
			val = db.get('quotes').shuffle().head().value();
		}
		this.printQuote(msg, val);
	}

	private listQuote(msg) {
		const db = this.serverDb[msg.guild.id];
		let val: { [key: string]: unknown }[] = null;
		if (msg.content.length > 0) {
			const cat = msg.content.split(' ')[0];
			if (!this.isCategory(db, cat)) {
				msg.reply('Not a valid category.');
				return;
			}
			val = db.get('quotes').filter({
				category: cat
			}).value();
		} else {
			val = db.get('quotes').value();
		}
		const quoteText: string = val.map((x) => this.constructQuote(x)).join('\n');

		if (quoteText.length < 1) {
			msg.reply('found no quotes...');
			return;
		}

		this.bot.printLong(msg.channel, quoteText);
	}

	private getQuote(msg) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const db: any = this.serverDb[msg.guild.id];
		const num: number = parseInt(msg.content);
		if (isNaN(num)) {
			msg.reply('You need to give a quote number in order to get a quote');
			return;
		}
		const val = db.get('quotes').find({
			id: num
		}).value();
		if (typeof val === 'undefined') {
			msg.reply('Quote not found.');
			return;
		}
		this.printQuote(msg, val);
	}

	private deleteQuote(msg) {
		const db = this.serverDb[msg.guild.id];
		if (!this.bot.isMod(msg.channel, msg.author)) {
			msg.reply('You are not allowed to do that');
		}
		const num: number = parseInt(msg.content);
		if (isNaN(num)) {
			msg.reply('You need to give a quote number in order to get a quote');
			return;
		}
		const val = db.get('quotes').find({
			id: num
		}).value();
		if (typeof val === 'undefined') {
			msg.reply('Quote not found.');
			return;
		}
		db.get('quotes').remove({
			id: num
		}).write();
		msg.reply('Quote removed: ');
		this.printQuote(msg, val);
	}

	private addQuote(msg) {
		const splt = msg.content.split('"');
		const supersplit = [];
		splt.forEach(function (element) {
			supersplit.push(element.split(' '));
		}, this);
		supersplit.forEach(function (element, i, arr) {
			arr[i] = element.filter(Boolean);
		}, this);

		if (supersplit.length < 2) {
			msg.reply('Usage: specify the quote in quotations, with one word before or after to specify its category');
			return;
		}
		if (supersplit[0].length + supersplit[2].length > 1) {
			msg.reply('Usage: specify the quote in quotations, with one word before or after to specify its category');
			return;
		}

		let category = '';
		if (supersplit[0].length === 1) {
			category = supersplit[0][0];
		} else {
			category = supersplit[2][0];
		}
		const quote = supersplit[1].join(' ');
		const db = this.serverDb[msg.guild.id];
		let id = db.get('nextID').value();
		db.get('quotes').push({
			'id': id++,
			'quote': quote,
			'category': category
		}).write();
		db.assign({
			'nextID': id
		}).write();
		msg.reply('Quote added:');
		const val = db.get('quotes').find({
			'id': (id - 1)
		}).value();
		this.printQuote(msg, val);
	}

	private quoteHandler(msg) {
		let command = msg.content.split(' ')[0];
		msg.content = msg.content.substr(command.length + 1, msg.content.length);
		if (command === '') {
			command = 'random';
		}
		const fn = this.subcommands[command];
		if (typeof fn === 'function') {
			fn(msg);
		} else {
			msg.reply('Cannot find subcommand... [' + command + ']');
		}
	}
}

export default (bot: Bot) => {return new quoteCog(bot);}