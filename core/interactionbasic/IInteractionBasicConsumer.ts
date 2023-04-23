import { Cog } from '../../lib/Cog';
import { BasicInteractionRegistration } from './BasicInteractionInformation';

export interface IInteractionBasicConsumer extends Cog {
	getInteractionRegistration(): BasicInteractionRegistration[];
}