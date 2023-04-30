import crypto from 'crypto';
import express from 'express';
import { EntityManager, MoreThan } from 'typeorm';
import { WebSession } from './WebSession';

type SessionData = {
	cogs: { [key: string]: unknown };
	public: unknown;
}

function isValidSessionData(sessionData: unknown): sessionData is SessionData {
	if (typeof (sessionData) === 'object' && sessionData) {
		if (Object.hasOwn(sessionData, 'cogs') && Object.hasOwn(sessionData, 'public')) {
			return true;
		}
	}
	return false;
}

export class SessionAccessor {
	private cogName: string;
	private sessionManager: SessionManager;

	constructor(cogName: string, sessionManager: SessionManager) {
		this.cogName = cogName;
		this.sessionManager = sessionManager;
	}

	public async getCogSessionForRequest(req: express.Request, res?: express.Response): Promise<unknown | void> {
		const session = await this.sessionManager.getSessionForRequest(req, res);
		if (session) {
			const parsedData: unknown = JSON.parse(session.data);
			if (isValidSessionData(parsedData) && Object.hasOwn(parsedData.cogs, this.cogName)) {
				return parsedData.cogs[this.cogName];
			}
		}
		return {};
	}

	public async getPublicSessionForRequest(req: express.Request, res?: express.Response): Promise<unknown | void> {
		const session = await this.sessionManager.getSessionForRequest(req, res);
		if (session) {
			const parsedData: unknown = JSON.parse(session.data);
			if (isValidSessionData(parsedData)) {
				return parsedData.public;
			}
		}

		return {};
	}

	public async saveCogSessionForRequest(req: express.Request, res: express.Response, data: unknown): Promise<void> {
		const session = await this.sessionManager.getSessionForRequest(req, res);
		if (session) {
			const parsedData: unknown = JSON.parse(session.data);
			if (isValidSessionData(parsedData)) {
				parsedData.cogs[this.cogName] = data;
			}
			session.data = JSON.stringify(parsedData);
			await this.sessionManager.updateSessionForRequest(req, res, session);
		} else {
			// Passing a response implies creating a session if one doesn't exist, so getSessionForRequest
			// should not return undefined here unless you've done something fucky
			throw new Error(`Failed to establish session for request ${req.id}}`);
		}
	}

	public async savePublicSessionForRequest(req: express.Request, res: express.Response, data: unknown): Promise<void> {
		const session = await this.sessionManager.getSessionForRequest(req, res);
		if (session) {
			const parsedData: unknown = JSON.parse(session.data);
			if (isValidSessionData(parsedData)) {
				parsedData.public = data;
				session.data = JSON.stringify(parsedData);
				await this.sessionManager.updateSessionForRequest(req, res, session);
			} else {
				throw Error(`Invalid session for request ${req.id}`);
			}
		} else {
			// Passing a response implies creating a session if one doesn't exist, so getSessionForRequest
			// should not return undefined here unless you've done something fucky
			throw new Error(`Failed to establish session for request ${req.id}}`);
		}
	}
}

export class SessionManager {
	private sessionTimeout: number = 1000 * 60 * 60 * 8;
	private entityManager: EntityManager;
	private cache: Map<string, WebSession>;

	constructor(entityManager: EntityManager) {
		this.entityManager = entityManager;
		this.cache = new Map<string, WebSession>();
	}

	/* eslint-disable @typescript-eslint/no-unsafe-member-access */
	public async getSessionForRequest(req: express.Request, res?: express.Response): Promise<WebSession | void> {
		if (this.cache.has(req.id)) {
			return this.cache.get(req.id);
		}

		if (req.cookies['session-token']) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const token = req.cookies['session-token'];
			if (typeof (token) !== 'string') {
				return undefined;
			}
			const session = await this.entityManager.findOne(WebSession, {
				where: {
					token,
					expiresAt: MoreThan(new Date()),
				}
			});
			if (session) {
				this.cache.set(req.id, session);

				const expiresAt = session.expiresAt.getTime();
				session.expiresAt = new Date(Date.now() + this.sessionTimeout);

				// To limit the load on the database, we only forcibly flush the session if it's within 10 minutes of expiring
				// This lowers the load on the database a lot when someone is clicking around and sending several requests per minute,

				if (expiresAt - Date.now() < (1000 * 60 * 60 * 5)) {
					await this.entityManager.save(session);
				}

				return session;
			}
		}

		if (res) {
			const session = new WebSession();
			session.token = generateSessionToken();
			session.expiresAt = new Date(Date.now() + this.sessionTimeout);
			session.data = JSON.stringify({cogs: {}, public: {}});
			await this.entityManager.save(session);
			res.cookie('session-token', session.token, {
				maxAge: this.sessionTimeout,
				httpOnly: true
			});
			this.cache.set(req.id, session);
			return session;
		}
	}

	public async updateSessionForRequest(req: express.Request, res: express.Response, session: WebSession): Promise<void> {
		this.cache.set(req.id, session);
		await this.entityManager.save(session);
		res.cookie('session-token', session.token, {
			maxAge: this.sessionTimeout,
			httpOnly: true
		});
	}

	public clearCacheForRequest(req: express.Request): void {
		if (this.cache.has(req.id)) {
			this.cache.delete(req.id);
		}
	}
	/* eslint-enable @typescript-eslint/no-unsafe-member-access */
}

function generateSessionToken(): string {
	const randomBytes = crypto.randomBytes(60);
	const charset = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	const token = [];
	for (let i = 0; i < 60; ++i) {
		token.push(charset[randomBytes[i] % charset.length]);
	}
	return token.join('');
}

