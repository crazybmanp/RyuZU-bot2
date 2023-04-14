import { Cog } from '../Cog';

export interface IFunctionProvider extends Cog {
	registerCog(target: Cog): void;
}