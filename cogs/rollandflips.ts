import { SlashCommandSubcommandBuilder } from '@discordjs/builders';
import Discord, { TextChannel } from 'discord.js';
import { Bot } from '../lib/Bot';
import { Cog } from '../lib/Cog';
import { SubcommandHandler } from '../lib/Subcommand';
import { utilCog } from '../util';

type rollResults = { total: number, rolls: number[] };

class rollandflips extends Cog {
	requires: string[] = [];
	cogName: string = 'rollandflips';

	setup(): void {
		const quoteSubcommand = new SubcommandHandler('roll', 'Roll dice, flip coins, and other random things.');

		quoteSubcommand.addSubcommand({
			command: 'roll',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('roll')
				.setDescription('Roll dice.')
				.addStringOption(option => option
					.setName('dice')
					.setDescription('The dice to roll.')
					.setRequired(true)),
			function: this.RollDice.bind(this),
		});

		quoteSubcommand.addSubcommand({
			command: 'coinflip',
			subcommandBuilder: new SlashCommandSubcommandBuilder()
				.setName('coinflip')
				.setDescription('Flips a coin.'),
			function: this.CoinFlip.bind(this),
		});

		this.bot.registerCommand({
			command: 'roll',
			commandBuilder: quoteSubcommand.getSlashCommandBuilder(),
			function: quoteSubcommand.resolveSubcommand.bind(quoteSubcommand),
		})
	}

	public RollGenericDice(numberOfDice: number, numberOfSides: number): rollResults {
		const results: rollResults = {
			total: 0,
			rolls: []
		}
		for (let i = 0; i < numberOfDice; i++) {
			const roll = Math.floor(Math.random() * numberOfSides) + 1;
			results.rolls.push(roll);
			results.total += roll;
		}
		return results;
	}

	private async RollDice(interaction: Discord.CommandInteraction): Promise<void> {
		// regex to split a string into an array of blank dice number or number dice number
		const regex = /(\d+)?d(\d+)/g;
		const dice = interaction.options.getString('dice').match(regex);
		if (dice == null) {
			void interaction.reply('Invalid dice.');
			return;
		}
		await interaction.deferReply();

		const rollResults = [];
		let total = 0;
		for (let i = 0; i < dice.length; i++) {
			const die = dice[i].split('d');
			const numDice = die[0] == '' ? 1 : parseInt(die[0]);
			const numSides = parseInt(die[1]);
			rollResults.push(this.RollGenericDice(numDice, numSides));
		}
		const resultMessages = [];
		for (let i = 0; i < rollResults.length; i++) {
			const result = rollResults[i];
			total += result.total;
			resultMessages.push('Rolled ');
			for (let j = 0; j < result.rolls.length; j++) {
				resultMessages.push(`${result.rolls[j]}, `);
			}
			resultMessages.push(` for a total of ${result.total}\n`);
		}
		await interaction.editReply('Here is that roll:');
		await this.bot.getCog<utilCog>('util').printLong((interaction.channel as TextChannel), resultMessages);
		await interaction.channel.send(`Grand Total: ${total}`);
	}

	private CoinFlip(interaction: Discord.CommandInteraction): void {
		const coin = Math.floor(Math.random() * 2);
		if (coin == 0) {
			void interaction.reply('Heads');
		} else {
			void interaction.reply('Tails');
		}
	}
}

export default (bot: Bot): rollandflips => { return new rollandflips(bot); }