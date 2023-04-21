import { Bot } from '../../lib/Bot';
import { Cog } from '../../lib/Cog';
import { IWebConsumer } from '.';
import express, { Express, RequestHandler } from 'express';
import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { WebConfig } from '../../lib/Config';
import fs from 'fs';
import https from 'https';
import http from 'http';

export class webCog extends Cog {
	requires: string[] = [];
	cogName: string = 'web';

	private registeredConsumers: IWebConsumer[];
	private config: WebConfig

	private httpServer: http.Server;
	private httpsServer?: https.Server;
	private express: Express;

	constructor(bot: Bot) {
		super(bot);

		const configTest = this.bot.config.webConfig;
		if (!configTest) throw new Error('Web config not found');
		this.config = configTest;

		this.registeredConsumers = [];
	}

	setup(): void {
		if (this.config.enable.command) {
			this.bot.registerCommand({
				command: 'website',
				commandBuilder: new SlashCommandBuilder()
					.setName('website')
					.setDescription('Sends a link to the website'),
				function: this.website.bind(this)
			})
		}
	}

	postSetup(): void {
		const creds = this.resolveCredentials();

		this.express = express();

		if (creds) {
			this.bot.logger.info('SSL enabled')
			this.httpsServer = https.createServer(creds, this.express);
		} else {
			this.bot.logger.info('SSL disabled')
		}
		this.httpServer = http.createServer(this.express);

		this.MainExpressSetup(this.express);

		for (const consumer of this.registeredConsumers) {
			this.bot.logger.debug(`Registering routes for ${consumer.cogName} cog.`);
			this.setRoute(consumer.cogName, consumer.getRoute());
		}

		if (this.httpsServer) {
			if (!this.config.ssl) throw new Error('SSL config not found after completing ssl setup, fatal misconfiguration');
			this.httpsServer.listen(this.config.ssl.port)
		}
		this.httpServer.listen(this.config.port);
	}

	registerCog(target: IWebConsumer): void {
		this.bot.logger.debug(`Registering cog ${target.cogName} for web.`);
		this.registeredConsumers.push(target);
	}

	private MainExpressSetup(app: Express): void {
		if (this.config.enable.homepage) {
			app.get('/', (req, res) => {
				res.send(`
				<html>
					<head>
						<title>Ryuzu</title>
						<style>
							body {
								background-color: #2f3136;
								color: #fff;
								font-family: sans-serif;
							}
							#container {
								width: 100%;
								height: 100%;
								display: flex;
								justify-content: center;
								align-items: center;
							}
							#content {
								text-align: center;
							}
							#content h1 {
								font-size: 5rem;
							}
							#content h2 {
								font-size: 2rem;
							}
							#content p {
								font-size: 1.5rem;
							}
						</style>
					</head>
					<body>
						<div id="container">
							<div id="content">
								<h1>RyuZu</h1>
								<h2>${this.bot.config.gameMessage} - ${this.bot.version}</h2>
								<p>${this.bot.config.description}</p>
							</div>
						</div>
					</body>
				</html>
				`);
			})
		}

		if (this.config.enable.health) {
			app.get('/ready', (req, res) => {
				if (!this.bot.ready) {
					res.status(500).send('Not ready');
				} else {
					res.send('OK');
				}
			})

			app.get('/health', (req, res) => {
				res.send('OK')
			})
		}
	}

	private setRoute(cogname: string, handler: RequestHandler): void {
		this.express.get(`/cog/${cogname}`, handler);
	}

	private website(interaction: CommandInteraction): void {
		void interaction.reply(`https://${this.getWebroot()}`);
	}

	public getWebroot(forceNonSSL: boolean = false): string {
		let port: number;
		if (!forceNonSSL && this.config.ssl) {
			port = this.config.ssl.port;
		} else {
			port = this.config.port;
		}
		return `${this.config.webroot}:${port}/`;
	}


	private resolveCredentials(): { key: string, cert: string } | undefined {
		if (!this.config.ssl) return undefined;

		let key = this.config.ssl.sslKey;
		if (!key) {
			if (!this.config.ssl.sslKeyLocation) throw new Error('No ssl key or location provided');
			key = fs.readFileSync(this.config.ssl.sslKeyLocation, 'utf8');
		}

		let cert = this.config.ssl.sslCert;
		if (!cert) {
			if (!this.config.ssl.sslCertLocation) throw new Error('No ssl cert or location provided');
			cert = fs.readFileSync(this.config.ssl.sslCertLocation, 'utf8');
		}
		return { key, cert };
	}
}

export default (bot: Bot): webCog => { return new webCog(bot); }
