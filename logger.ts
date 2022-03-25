import bunyan from 'bunyan';
import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import { Bot } from './lib/Bot';
import { Cog } from './lib/Cog';

class loggerCog extends Cog {
	requires: string[] = [];

	preinit() {
		const lb = new LoggingBunyan({
			logName: this.bot.config.stackdriverName ? this.bot.config.stackdriverName : 'ryuzu',
		});

		const streams: {level: bunyan.LogLevel, type?: string, stream: NodeJS.WriteStream|NodeJS.WritableStream}[] = [
			{
				stream: process.stdout,
				level: 'info'
			},
		];

		if (!this.bot.config.devMode) {
			streams.push(lb.stream('info'));
		}

		this.bot.logger = bunyan.createLogger({
			name: 'RyuZU2',
			streams: streams
		});
	}
}

export default (bot: Bot) => { return new loggerCog(bot); };