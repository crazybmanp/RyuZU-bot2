import { Cog } from '../../lib/Cog';
import { RequestHandler } from 'express';

export interface IWebConsumer extends Cog {
	getRoute(): RequestHandler;
}