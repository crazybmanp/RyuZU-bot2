import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CommandRegistration } from './Bot';
import { SubcommandGroupHandler } from './SubcommandGroup';

export type SubCommandRegistration = Omit<CommandRegistration, 'commandBuilder'> & { subcommandBuilder: SlashCommandSubcommandBuilder }

export class SubcommandHandler {
	private name: string;
	private description: string;
	private subcommands: SubCommandRegistration[];
	private subcommandGroups: SubcommandGroupHandler[];

	constructor(commandName: string, description: string) {
		this.subcommands = [];
		this.subcommandGroups = [];
		this.name = commandName;
		this.description = description;
	}

	public addSubcommand(command: SubCommandRegistration): void {
		if (this.subcommands.some(e => e.command === command.command)) {
			throw new Error(`Subcommand ${command.command} already exists.`);
		}
		this.subcommands.push(command);
	}

	public addSubcommandGroup(command: SubcommandGroupHandler): void {
		if (this.subcommandGroups.some(e => e.name === command.name)) {
			throw new Error(`Subcommand Group ${command.name} already exists.`);
		}
		this.subcommandGroups.push(command);
	}

	public getSlashCommandBuilder(): SlashCommandBuilder {
		const cb = new SlashCommandBuilder();
		cb.setName(this.name);
		cb.setDescription(this.description);

		for(const subcommand of this.subcommands) {
			cb.addSubcommand(subcommand.subcommandBuilder);
		}

		for (const subcommandGroup of this.subcommandGroups) {
			cb.addSubcommandGroup(subcommandGroup.getSubcommandGroupBuilder());
		}

		return cb;
	}

	public async resolveSubcommand(interaction: CommandInteraction): Promise<void> {
		const groupStr = interaction.options.getSubcommandGroup(false);
		const commandStr = interaction.options.getSubcommand(false);

		if (groupStr) {
			const group = this.subcommandGroups.find(e => e.name === groupStr);
			if (!group) {
				throw new Error(`Subcommand group ${groupStr} of command ${this.name} does not exist.`);
			}
			await group.resolveSubcommandGroup(interaction);
		} else {
			if (!commandStr) throw new Error('No subcommand or subcommand group provided.');
			const command = this.subcommands.find(e => e.command === commandStr);
			if (!command) {
				throw new Error(`Subcommand ${commandStr} of command ${this.name} does not exist.`);
			}
			await command.function(interaction);
		}
	}
}