import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CommandRegistration } from './Bot';

export type SubCommandRegistration = Omit<CommandRegistration, 'commandBuilder'> & { subcommandBuilder: SlashCommandSubcommandBuilder }

export class SubcommandHandler {
	private name: string;
	private description: string
	private subcommands: SubCommandRegistration[];

	constructor(commandName: string, description: string) {
		this.subcommands = [];
		this.name = commandName;
		this.description = description;
	}

	public addSubcommand(command: SubCommandRegistration): void {
		if (this.subcommands.some(e => e.command === command.command)) {
			throw new Error(`Subcommand ${command.command} already exists.`);
		}
		this.subcommands.push(command);
	}

	public getSlashCommandBuilder(): SlashCommandBuilder {
		const cb = new SlashCommandBuilder();
		cb.setName(this.name);
		cb.setDescription(this.description);

		for(const subcommand of this.subcommands) {
			cb.addSubcommand(subcommand.subcommandBuilder);
		}

		return cb;
	}

	public async resolveSubcommand(interaction: CommandInteraction): Promise<void> {
		const commandStr = interaction.options.getSubcommand();
		const command = this.subcommands.find(e => e.command === commandStr);
		if (!command) {
			throw new Error(`Subcommand ${commandStr} of command ${this.name} does not exist.`);
		}
		await command.function(interaction);
	}
}