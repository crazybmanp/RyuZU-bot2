import crypto from 'crypto';

import express from 'express';
import fetch from 'node-fetch';
import { WebConfig } from '../../lib/Config';
import { OAuth2Routes, RouteBases, Routes, RESTPostOAuth2AccessTokenResult, RESTGetAPICurrentUserResult, RESTGetAPICurrentUserGuildsResult } from 'discord-api-types/v10';
import { Permissions } from 'discord.js';
import { EntityManager, In } from 'typeorm';
import { Guild } from '../../model';
import { SessionAccessor } from './session';

export interface IAuthUserGuild {
	id: string;
	name: string;
	isMod: boolean;
	isOwner: boolean;
}

export interface IAuthUserProfile {
	id: string;
	username: string;
	guilds: IAuthUserGuild[];
}

type DiscordAuthProviderSession = {
	authNonce?: string;
	discordUserId?: string;
	redirectPath?: string;
}

export type DiscordAuthProviderPublicSession = {
	user: IAuthUserProfile;
}

export class DiscordAuthProvider {
	private config: WebConfig;
	private app: express.Application;
	private entityManager: EntityManager;
	private sessionAccessor: SessionAccessor;

	constructor(config: WebConfig, app: express.Application, entityManager: EntityManager, sessionAccessor: SessionAccessor) {
		this.config = config;
		this.app = app;
		this.entityManager = entityManager;
		this.sessionAccessor = sessionAccessor;
	}

	public requireAuth(redirectUrl: string): (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void> {
		return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
			if (!this.config.auth) {
				throw new Error('No auth config found');
			}

			const session = await this.sessionAccessor.getCogSessionForRequest(req, res) as DiscordAuthProviderSession;
			if (!session.discordUserId) {
				session.redirectPath = redirectUrl;
				await this.sessionAccessor.saveCogSessionForRequest(req, res, session);
				return res.redirect('/auth/discord');
			}

			next();
		}
	}

	public setupRoutes(): void {
		const redirect = `${this.config.webroot}/auth/discord/callback`;
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.app.get('/auth/discord', async (req, res) => {
			if (!this.config.auth) {
				throw new Error('No auth config found');
			}

			const authNonce = crypto.randomUUID();
			const session = await this.sessionAccessor.getCogSessionForRequest(req, res) as DiscordAuthProviderSession;
			session.authNonce = authNonce;

			await this.sessionAccessor.saveCogSessionForRequest(req, res, session);

			return res.redirect(`${OAuth2Routes.authorizationURL}?client_id=${this.config.auth.clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent('identify guilds')}&state=${authNonce}`)
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.app.get('/auth/discord/callback', async (req, res) => {
			if (!this.config.auth) {
				throw new Error('No auth config found');
			}
			const code = typeof (req.query.code) === 'string' ? req.query.code : '';
			const nonce = typeof (req.query.state) === 'string' ? req.query.state : '';

			const session = await this.sessionAccessor.getCogSessionForRequest(req, res) as DiscordAuthProviderSession;
			if (session.authNonce !== nonce || !nonce || !session.authNonce) {
				return res.redirect('/auth/discord');
			}

			const exchangeData = {
				client_id: this.config.auth.clientId,
				client_secret: this.config.auth.clientSecret,
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirect,
			}

			const result = await fetch(OAuth2Routes.tokenURL, {
				method: 'POST',
				body: new URLSearchParams(exchangeData),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			if (result.status !== 200) {
				throw new Error(`Failed to exchange code for token: ${result.status} ${result.statusText} (${await result.text()})`);
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const resultBody: RESTPostOAuth2AccessTokenResult = await result.json();
			const userResult = await fetch(`${RouteBases.api}${Routes.user('@me')}`, {
				headers: {
					Authorization: `${resultBody.token_type} ${resultBody.access_token}`
				}
			});

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const discordUser: RESTGetAPICurrentUserResult = await userResult.json();
			const guildsResult = await fetch(`${RouteBases.api}${Routes.user('@me')}/guilds?limit=200`, {
				headers: {
					Authorization: `${resultBody.token_type} ${resultBody.access_token}`
				}
			});

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const discordGuilds: RESTGetAPICurrentUserGuildsResult = await guildsResult.json();
			const guildIds = discordGuilds.map(x => x.id);
			const mutualGuilds = await this.entityManager.find(Guild, {
				where: {
					id: In(guildIds)
				}
			});

			const profileUser: IAuthUserProfile = {
				id: discordUser.id,
				username: `${discordUser.username}#${discordUser.discriminator}`,
				guilds: discordGuilds.filter(x => mutualGuilds.some(y => y.id === x.id)).map((guild) => {
					const permissions = new Permissions(BigInt(guild.permissions));

					return {
						id: guild.id,
						name: guild.name,
						isMod: permissions.has('MANAGE_MESSAGES'),
						isOwner: guild.owner,
					}
				})
			}

			await this.sessionAccessor.saveCogSessionForRequest(req, res, {
				discordUserId: discordUser.id,
			});

			await this.sessionAccessor.savePublicSessionForRequest(req, res, {
				user: profileUser,
			});

			if (session.redirectPath) {
				return res.redirect(session.redirectPath);
			} else {
				return res.redirect('/');
			}
		});
	}
}