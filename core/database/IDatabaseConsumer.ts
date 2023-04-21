import { EntityManager } from 'typeorm';
import { Cog } from '../../lib/Cog';
import { databaseCog } from '.';

export interface IDatabaseConsumer extends Cog {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getModels(): unknown[];
	giveManager(manager: EntityManager, database: databaseCog): void;
	shutdownManager(): void;
}