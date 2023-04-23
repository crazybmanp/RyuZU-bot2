import { MessageComponentInteraction } from 'discord.js';

export type BasicInteractionInformation = {
	cogName: string;
	commandName: string;
	subInteractionName?: string;
	ident?: string;
}

export type InteractionHandler =
	(
		interaction: MessageComponentInteraction,
		interactionInformation: BasicInteractionInformation
	) => void | Promise<void>;

export type BasicSubInteractionRegistration = {
	subInteractionName: string;
	subInteractionHandler: InteractionHandler;
}

export type BasicInteraction = {
	cogName: string;
	commandName: string;
	subInteractionRegistration?: BasicSubInteractionRegistration[];
	interactionHandler?: InteractionHandler;
}

export type BasicInteractionRegistration = Omit<BasicInteraction, 'cogName'>;

export function generateInteractionString(interaction: BasicInteractionInformation): string {
	return [interaction.cogName, interaction.commandName, interaction.subInteractionName, interaction.ident].join(':');
}

export function parseInteraction(interaction: string): BasicInteractionInformation {
	const [cogName, commandName, subInteractionName, ...idents] = interaction.split(':');
	const ident = idents.join(':');
	return { cogName, commandName, subInteractionName, ident};
}