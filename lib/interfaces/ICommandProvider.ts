import { Command } from 'commander';
import { Cog } from '../Cog';

export function isCommand(cog: Cog): cog is ICommandProvider {
	return (cog as ICommandProvider).getCommands !== undefined;
}

export interface ICommandProvider extends Cog {
	getCommands(): Command[];
}