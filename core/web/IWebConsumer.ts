import { Cog } from '../../lib/Cog';
import { RequestHandler } from 'express';
import { SessionAccessor } from './session';

export interface IWebConsumer extends Cog {
	getRoute(): RequestHandler;
	giveSessionAccessor?: (accessor: SessionAccessor) => void;
}