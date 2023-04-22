import { SlashCommandSubcommandGroupBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { SubCommandRegistration } from './Subcommand';

export class SubcommandGroupHandler {
	public name: string;
	private description: string;
	private subcommands: SubCommandRegistration[];

	constructor(groupName: string, description: string) {
		this.name = groupName;
		this.description = description;
		this.subcommands = [];
	}

	public addSubcommand(command: SubCommandRegistration): void {
		if (this.subcommands.some(e => e.command === command.command)) {
			throw new Error(`Subcommand ${command.command} already exists in the group.`);
		}
		this.subcommands.push(command);
	}

	public async resolveSubcommandGroup(interaction: CommandInteraction): Promise<void> {
		const commandStr = interaction.options.getSubcommand();
		const command = this.subcommands.find(e => e.command === commandStr);

		if (!command) {
			throw new Error(`Subcommand ${commandStr} of group ${this.name} does not exist.`);
		}

		await command.function(interaction);
	}

	public getSubcommandGroupBuilder(): SlashCommandSubcommandGroupBuilder {
		const sgb = new SlashCommandSubcommandGroupBuilder();
		sgb.setName(this.name);
		sgb.setDescription(this.description);

		for (const subcommand of this.subcommands) {
			sgb.addSubcommand(subcommand.subcommandBuilder);
		}

		return sgb;
	}
}
