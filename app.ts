import { program } from 'commander';
import sourceMapSupport from 'source-map-support';
import { Bot } from './lib/Bot';
import { isCommand } from './lib/interfaces/ICommandProvider';
sourceMapSupport.install();


const bot = new Bot();
const botSetup = bot.setup();

program.command('run')
	.description('Start the bot')
	.action(
		() => {
			bot.logger.info('Connecting to discord...');
			void bot.connectToDiscord();
		});

program.command('deregister')
	.description('Deregister The interactions this bot has registered.')
	.action(async () => {
		await bot.deregisterInteractions();
	});


void botSetup.then(() => {
	for (const cogName in bot.loadedCogs) {
		const cog = bot.loadedCogs[cogName]
		if (isCommand(cog)) {
			for (const command of cog.getCommands()) {
				program.addCommand(command);
			}
		}
	}

	program.parse()
});
