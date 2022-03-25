import { PresenceData } from 'discord.js';
import { ActivityTypes } from 'discord.js/typings/enums';
import sourceMapSupport from 'source-map-support';
import { Bot } from './lib/Bot';
sourceMapSupport.install();

const coreCogs = ['./admin.js', './util.js'];

const bot = new Bot('config.json');

bot.client.on('ready', () => {
	bot.logger.info(`Logged in as ${bot.client.user.tag}! Now readying up!`);
	for (const cogName in bot.loadedCogs) {
		const cog = bot.loadedCogs[cogName];
		if (typeof cog.ready === 'function') {
			bot.logger.info('Readying ' + cogName);
			cog.ready();
		}
	}

	const presence: PresenceData = {
		status: 'online',
		afk: false,
		activities: [{
			name: bot.config.commandString + ' ' + bot.config.gameMessage + '[' + bot.version + ']',
			type: ActivityTypes.PLAYING
		}]
	};
	bot.client.user.setPresence(presence);
	bot.ready = true;
	bot.logger.info("RyuZu " + bot.version + " ready!");
});

bot.client.on('guildCreate', guild => {
	bot.logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
	for (const cogName in bot.loadedCogs) {
		const cog = bot.loadedCogs[cogName];
		if (typeof cog.newGuild === 'function') {
			bot.logger.info('Notifying ' + cogName + ' of new guild.');
			cog.newGuild(guild);
		}
	}
});

bot.client.on('message', async msg => {
	if (!bot.ready) {
		bot.logger.warn('BOT RECIEVED MESSAGE BEFORE READY COMPLETED');
		return;
	}
	if (!msg.content.startsWith(bot.config.commandString)) {
		return;
	}
	msg.content = msg.content.substr(bot.config.commandString.length, msg.content.length);
	const command = msg.content.split(' ')[0];
	msg.content = msg.content.substr(command.length + 1, msg.content.length);
	const fn = bot.listeners[command];
	msg.channel.sendTyping();
	if (typeof fn === 'function') {
		try {
			await fn(msg);
		} catch (error) {
			bot.logger.error('Command error on input: ' + msg.content, { error });
		}
	} else {
		msg.reply('I don\'t quite know what you want from me... [not a command]');
	}
});

// -----------
// Begin Setup
// -----------

// register base commands
bot.registerCommand('ping', async function (msg) {
	await msg.reply('Pong!');
});

// Load Core Cogs
coreCogs.forEach(function (element) {
	bot.loadCog(element);
}, this);

// Load Startup Cogs
bot.config.startupExtensions.forEach(function (element) {
	bot.loadCog(element);
}, this);

// start the client
bot.client.login(bot.config.token);
