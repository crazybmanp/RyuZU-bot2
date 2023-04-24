import { MessageComponentInteraction } from 'discord.js';
import { Cog } from '../Cog';

export function isInteractionConsumer(cog: Cog): cog is IInteractionConsumer {
	return (cog as IInteractionConsumer).handleInteraction !== undefined;
}

export interface IInteractionConsumer extends Cog {
	shortName: string | undefined;
	handleInteraction(interaction: MessageComponentInteraction, customIdParsed: string): void;
}