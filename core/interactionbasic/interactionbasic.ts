import { MessageComponentInteraction } from 'discord.js';
import { IInteractionBasicConsumer } from '.';
import { Bot } from '../../lib/Bot';
import { Cog } from '../../lib/Cog';
import { IInteractionConsumer } from '../../lib/interfaces/IInteractionConsumer';
import { BasicInteraction, generateInteractionString, parseInteraction } from './BasicInteractionInformation';

export class InteractionBasicCog extends Cog implements IInteractionConsumer {
	requires: string[] = [];
	cogName: string = 'interactionbasic';
	shortName: string = 'ib';

	private registeredConsumers: IInteractionBasicConsumer[];
	private registeredInteractions: BasicInteraction[];

	constructor(bot: Bot) {
		super(bot);
		this.registeredConsumers = [];
		this.registeredInteractions = [];
	}

	postSetup(): void {
		for (const consumer of this.registeredConsumers) {
			this.bot.logger.debug(`Registering interactions for ${consumer.cogName} cog.`);

			const interactions = consumer.getInteractionRegistration();

			//TODO: might be good to check for duplicate interaction and subinteraction names, but it can only mess up the cog that makes this mistake.
			for (const interaction of interactions) {
				const int = {
					cogName: consumer.cogName,
					...interaction
				}

				this.registeredInteractions.push(int);
			}
		}
	}

	registerConsumer(target: Cog): void {
		this.bot.logger.debug(`Registering cog ${target.cogName} for interactionbasic.`);
		this.registeredConsumers.push(target as IInteractionBasicConsumer);
	}

	async handleInteraction(interaction: MessageComponentInteraction, customIdParsed: string): Promise<void> {
		const interactionInformation = parseInteraction(customIdParsed);

		const matchingInteractions = this.registeredInteractions.filter((int) => {
			return int.cogName === interactionInformation.cogName && int.commandName === interactionInformation.commandName;
		});

		if (matchingInteractions.length === 0) {
			this.bot.logger.warn(`No matching interactions found for ${customIdParsed}`);
			return;
		}

		if (matchingInteractions.length > 1) {
			this.bot.logger.warn(`Multiple matching interactions found for ${customIdParsed}`);
			return;
		}

		const matchingInteraction = matchingInteractions[0];

		if (matchingInteraction.subInteractionRegistration !== undefined) {
			for (const subInteraction of matchingInteraction.subInteractionRegistration) {
				if (subInteraction.subInteractionName === interactionInformation.subInteractionName) {
					await subInteraction.subInteractionHandler(interaction, interactionInformation);
					return;
				}
			}
		}

		if (matchingInteraction.interactionHandler !== undefined) {
			await matchingInteraction.interactionHandler(interaction, interactionInformation)
			return;
		}

		this.bot.logger.warn(`No matching interaction handler found for ${customIdParsed}`);
	}

	makeInteractionCustomId(cog: Cog, commandName: string, subInteractionName: string, ident?: string): string {
		const matchingInteractions = this.registeredInteractions.filter((int) => {
			return int.cogName === cog.cogName && int.commandName === commandName;
		});

		if (matchingInteractions.length === 1) {
			return `#${this.shortName}:${generateInteractionString({
				cogName: cog.cogName,
				commandName,
				subInteractionName,
				ident
			})}`
		} else {
			throw new Error(`Invalid interaction information provided for cog ${cog.cogName}, command ${commandName}, subInteraction ${subInteractionName}`);
		}
	}
}

export default (bot: Bot): InteractionBasicCog => { return new InteractionBasicCog(bot); }