import { EntityManager } from 'typeorm';
import { databaseCog } from '../database';
import { Cog } from './Cog';

export interface IDatabaseConsumer extends Cog {
	getModels(): unknown[];
	giveManager(manager: EntityManager, database: databaseCog): void;
	shutdownManager(): void;
}