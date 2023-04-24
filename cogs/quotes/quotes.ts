import { SlashCommandSubcommandBuilder } from '@discordjs/builders';
import Discord, { TextChannel } from 'discord.js';
import { EntityManager } from 'typeorm';
import { adminCog } from '../../core/admin';
import { databaseCog, IDatabaseConsumer } from '../../core/database';
import { Bot } from '../../lib/Bot';
import { Cog } from '../../lib/Cog';
import { SubcommandHandler } from '../../lib/Subcommand';
import { QuoteNumber } from './QuoteNumber';
import { utilCog } from '../../core/util';
import { error } from 'console';
import { Quote } from './Quote';
// import { IWebConsumer, webCog } from '../../core/web';
// import { RequestHandler } from 'express';
export class quoteCog extends Cog implements IDatabaseConsumer {
	requires: string[] = ['core:database', 'core:util'];
	cogName: string = 'quotes';

	private manager: EntityManager;
	private databaseCog: databaseCog;

	constructor(bot: Bot) {
		super(bot);
	}

	// getRoute(): RequestHandler {
	// 	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	// 	return async (req, res) => {
	// 		const quote = await this.manager.createQueryBuilder(Quote, 'quote').orderBy('RANDOM()').getOne();
	// 		if (!quote) {
	// 			res.send(`There are no quotes`);
	// 			return;
	// 		}
	// 		res.send(this.constructQuote(quote));
	// 	}
	// }

	getModels(): unknown[] {
		return [Quote, QuoteNumber];
	}

	giveManager(manager: EntityManager, database: databaseCog): void {
		this.manager = manager;
		this.databaseCog = database;
	}

	shutdownManager(): void {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		//@ts-ignore
		this.manager = undefined;
	}

	setup(): void {
		const quoteSubcommand = new SubcommandHandler('quote', 'Make and see quotes for the server.');

		quoteSubcommand.addSubcommand({
			command: 'random',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('random')
				.setDescription('Get a random quote.')
				.addStringOption(option => option
					.setName('category')
					.setDescription('The category of the quote.')
					.setRequired(false)),
			function: this.commandRandomQuote.bind(this)
		});

		quoteSubcommand.addSubcommand({
			command: 'list',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('list')
				.setDescription('List the quotes')
				.addStringOption(option => option
					.setName('category')
					.setDescription('The category of the quote.')
					.setRequired(false)),
			function: this.listQuote.bind(this)
		});

		quoteSubcommand.addSubcommand({
			command: 'get',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('get')
				.setDescription('Get a quote by ID.')
				.addNumberOption(option => option
					.setName('number')
					.setDescription('The quote number to get.')
					.setRequired(true)),
			function: this.getQuote.bind(this)
		});

		quoteSubcommand.addSubcommand({
			command: 'delete',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('delete')
				.setDescription('Remove a quote, only available to moderators.')
				.addNumberOption(option => option
					.setName('number')
					.setDescription('The quote number to get.')
					.setRequired(true)),
			function: this.commandDeleteQuote.bind(this)
		});

		quoteSubcommand.addSubcommand({
			command: 'add',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('add')
				.setDescription('Add a quote')
				.addStringOption(option => option
					.setName('quote')
					.setDescription('The quote to add.')
					.setRequired(true))
				.addStringOption(option => option
					.setName('category')
					.setDescription('The category of the quote.')
					.setRequired(false)),
			function: this.addQuote.bind(this)
		});


		this.bot.registerCommand({
			command: 'quote',
			commandBuilder: quoteSubcommand.getSlashCommandBuilder(),
			function: quoteSubcommand.resolveSubcommand.bind(quoteSubcommand),
		})

		this.bot.getCog<databaseCog>('database').registerCog(this);
		// this.bot.getCog<webCog>('web').registerCog(this);
	}

	public async GiveQuote(guild: Discord.Guild, num: number|undefined = undefined): Promise<Quote> {
		let ret: Quote | null;
		if (num) {
			ret = await this.getQuoteById(guild, num);
		} else {
			ret = await this.randomQuote(guild);
		}

		if (!ret) {
			throw new Error('No quote found.');
		}

		return (JSON.parse(JSON.stringify(ret)) as Quote);
	}

	private async getCategories(guild: Discord.BaseGuild): Promise<string[]> {
		const results = await this.manager.createQueryBuilder(Quote, 'quote')
			.select('quote.category')
			.where('quote.guild = :guild', { guild: guild.id })
			.distinct()
			.getMany();
		return results.map((x) => {
			if (!x.category) {
				throw error('Category is null');
			}
			return x.category
		});
	}

	private async isCategory(guild: Discord.Guild, category: string): Promise<boolean> {
		return (await this.getCategories(guild)).includes(category);
	}

	private constructQuote(quote: Quote): string {
		return `${quote.quoteNumber} ${quote.category?`(${quote.category})`:``}: ${quote.text}`;
	}

	private printQuote(msg: Discord.CommandInteraction, quote: Quote): void {
		void msg.reply(this.constructQuote(quote));
	}

	private async randomQuote(guild: Discord.Guild, category: string|undefined = undefined): Promise<Quote | null> {
		const quote = this.manager.createQueryBuilder(Quote, 'quote')
			.where('quote.guild = :guild', { guild: guild.id })
			.orderBy('RANDOM()')
		if (category) {
			quote.andWhere('quote.category = :category', { category: category });
		}
		return quote.getOne();
	}

	private async getQuoteById(guild: Discord.Guild, id: number): Promise<Quote | null> {
		return this.manager.findOneBy(Quote, { quoteNumber: id, guildId: guild.id });
	}

	private async getQuoteByNumber(guild: Discord.Guild, quoteNumber: number): Promise<Quote | null> {
		return this.manager.findOne(Quote, { where: { guildId: guild.id, quoteNumber: quoteNumber } });
	}

	private async getAllQuotes(guild: Discord.Guild, category: string|undefined = undefined): Promise<(Quote[] | null)> {
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

	private async commandRandomQuote(interaction: Discord.CommandInteraction): Promise<void> {
		let category = interaction.options.getString('category');
		const guild = interaction.guild;
		if (!guild) {
			void interaction.reply({ ephemeral: true, content: 'You need to start this interaction from a guild.' });
			return;
		}

		if (category) {
			if (!await this.isCategory(guild, category)) {
				void interaction.reply({ ephemeral: true, content: 'Not a valid category.' });
				return;
			}
		} else {
			category = '';
		}

		const quote = await this.randomQuote(interaction.guild, category);
		if (!quote) {
			await interaction.reply({ ephemeral: true, content: 'This server has no quotes.' });
			return;
		}
		this.printQuote(interaction, quote);
	}

	private async listQuote(interaction: Discord.CommandInteraction): Promise<void> {
		await interaction.deferReply();
		const guild = interaction.guild;
		if (!guild) {
			void interaction.reply({ ephemeral: true, content: 'You need to start this interaction from a guild.' });
			return;
		}

		try {
			let category = interaction.options.getString('category');
			if (category) {
				if (!await this.isCategory(guild, category)) {
					void interaction.reply({ ephemeral: true, content: 'Not a valid category.' });
					return;
				}
			} else {
				category = '';
			}

			const quotes = await this.getAllQuotes(interaction.guild, category);
			if (!quotes) {
				void interaction.reply({ ephemeral: true, content: 'This server has no quotes.' });
				return;
			}

			const quoteText: string[] = quotes.map((x) => this.constructQuote(x));

			if (quoteText.length < 1) {
				void interaction.reply({ ephemeral: true, content: 'found no quotes...' });
				return;
			}

			void this.bot.getCog<utilCog>('util').printLong((interaction.channel as TextChannel), quoteText);
			void interaction.editReply(category ? `Here are all of the quotes in ${category}`: 'Here are all of the quotes');
		} catch (error) {
			this.bot.logger.error(error);
			void interaction.editReply('Something went wrong.');
		}
	}

	private async getQuote(interaction: Discord.CommandInteraction): Promise<void> {
		const num = interaction.options.getNumber('number');
		if (!num) {
			void interaction.reply({ ephemeral: true, content: 'You need to specify a quote number.' });
			return;
		}

		const guild = interaction.guild;
		if (!guild) {
			void interaction.reply({ ephemeral: true, content: 'You need to start this interaction from a guild.' });
			return;
		}

		const quote = await this.getQuoteByNumber(guild, num);

		if (!quote) {
			void interaction.reply({ ephemeral: true, content: 'Quote not found.' });
			return;
		}
		this.printQuote(interaction, quote);
	}

	private async commandDeleteQuote(interaction: Discord.CommandInteraction): Promise<void> {
		const guild = interaction.guild;
		if (!guild) {
			void interaction.reply({ ephemeral: true, content: 'You need to start this interaction from a guild.' });
			return;
		}
		const GM = guild.members.resolve(interaction.user.id);
		if (!GM || !this.bot.getCog<adminCog>('admin').isModOnServer(GM)) {
			void interaction.reply({ ephemeral: true, content: 'You are not allowed to do that' });
		}
		const num = interaction.options.getNumber('number');
		if (!num) {
			void interaction.reply({ ephemeral: true, content: 'You need to give a quote number in order to get a quote' });
			return;
		}

		const quote = await this.getQuoteByNumber(interaction.guild, num);

		if (!quote) {
			void interaction.reply({ephemeral: true, content: 'Quote not found.'});
			return;
		}

		const copy = (JSON.parse(JSON.stringify(quote)) as Quote);

		await this.deleteQuote(quote);

		await interaction.reply(`Quote removed: ${this.constructQuote(copy)}`);
	}

	private async addQuote(interaction: Discord.CommandInteraction): Promise<void> {
		const quoteText = interaction.options.getString('quote');
		if (!quoteText) {
			void interaction.reply({ ephemeral: true, content: 'You need to give a quote in order to add a quote' });
			return;
		}
		const category = interaction.options.getString('category');

		const guild = interaction.guild;
		if (!guild) {
			void interaction.reply({ ephemeral: true, content: 'You need to start this interaction from a guild.' });
			return;
		}

		let quote;
		await this.manager.transaction(async (tm) => {
			let nextNumber = await tm.findOneBy(QuoteNumber, { guildId: guild.id });
			if (!nextNumber) {
				nextNumber = new QuoteNumber();
				nextNumber.guildId = guild.id;
				nextNumber.nextQuoteNumber = 1;
			}

			quote = new Quote();
			quote.quoteNumber = nextNumber.nextQuoteNumber;
			quote.guildId = guild.id;
			quote.text = quoteText;
			quote.category = category ?? undefined;
			quote.creator = await this.databaseCog.findOrGetUser(interaction.user.id, guild.id);

			await tm.save(quote);

			nextNumber.nextQuoteNumber++;
			await tm.save(nextNumber);
		})

		if (!quote) {
			void interaction.reply({ ephemeral: true, content: 'Something went wrong. It is possible that your quote was added successfully.' });
			return;
		}
		await interaction.reply(`Quote added: ${this.constructQuote(quote)}`);
	}
}

export default (bot: Bot): quoteCog => { return new quoteCog(bot); }