import { SlashCommandSubcommandBuilder } from '@discordjs/builders';
import Discord, { TextChannel } from 'discord.js';
import { EntityManager } from 'typeorm';
import { adminCog } from '../admin';
import { databaseCog } from '../database';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import { IDatabaseConsumer } from '../lib/IDatabaseConsumer';
import { SubcommandHandler } from '../lib/Subcommand';
import { Quote } from '../model/Quote';
import { QuoteNumber } from '../model/QuoteNumber';
import { utilCog } from '../util';

export class quoteCog extends Cog implements IDatabaseConsumer {
	requires: string[] = ['./database.js', './util.js'];
	cogName: string = 'quotes';

	private manager: EntityManager;
	private databaseCog: databaseCog;

	constructor(bot: Bot) {
		super(bot);
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
	}

	public async GiveQuote(guild: Discord.Guild, num: number = undefined): Promise<Quote> {
		let ret: Quote;
		if (num) {
			ret = await this.getQuoteById(guild, num);
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

	private constructQuote(quote: Quote): string {
		return `${quote.quoteNumber} (${quote.category}): ${quote.text}`;
	}

	private printQuote(msg: Discord.CommandInteraction, quote: Quote): void {
		void msg.reply(this.constructQuote(quote));
	}

	private async randomQuote(guild: Discord.Guild, category: string = undefined): Promise<Quote> {
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

	private async getAllQuotes(guild: Discord.Guild, category: string = undefined): Promise<(Quote | null)[]> {
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
		if (category) {
			if (!await this.isCategory(interaction.guild, category)) {
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
		try {
			let category = interaction.options.getString('category');
			if (category) {
				if (!await this.isCategory(interaction.guild, category)) {
					void interaction.reply({ ephemeral: true, content: 'Not a valid category.' });
					return;
				}
			} else {
				category = '';
			}

			const quotes = await this.getAllQuotes(interaction.guild, category);

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
		const quote = await this.getQuoteByNumber(interaction.guild, num);

		if (!quote) {
			void interaction.reply({ ephemeral: true, content: 'Quote not found.' });
			return;
		}
		this.printQuote(interaction, quote);
	}

	private async commandDeleteQuote(interaction: Discord.CommandInteraction): Promise<void> {
		const GM = interaction.guild.members.resolve(interaction.user.id);
		if (!this.bot.getCog<adminCog>('admin').isModOnServer(GM)) {
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
		const category = interaction.options.getString('category');

		let quote;
		await this.manager.transaction(async (tm) => {
			let nextNumber = await tm.findOneBy(QuoteNumber, { guildId: interaction.guild.id });
			if (!nextNumber) {
				nextNumber = new QuoteNumber();
				nextNumber.guildId = interaction.guild.id;
				nextNumber.nextQuoteNumber = 1;
			}

			quote = new Quote();
			quote.quoteNumber = nextNumber.nextQuoteNumber;
			quote.guildId = interaction.guild.id;
			quote.text = quoteText;
			quote.category = category;
			quote.creator = await this.databaseCog.findOrGetUser(interaction.user.id, interaction.guild.id);

			await tm.save(quote);

			nextNumber.nextQuoteNumber++;
			await tm.save(nextNumber);
		})

		await interaction.reply(`Quote added: ${this.constructQuote(quote)}`);
	}
}

export default (bot: Bot): quoteCog => { return new quoteCog(bot); }