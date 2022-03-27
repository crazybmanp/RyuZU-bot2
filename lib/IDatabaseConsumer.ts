import { EntityManager } from 'typeorm';
import { databaseCog } from '../database';
import { Cog } from './Cog';

export interface IDatabaseConsumer extends Cog {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getModels(): unknown[];
	giveManager(manager: EntityManager, database: databaseCog): void;
	shutdownManager(): void;
}