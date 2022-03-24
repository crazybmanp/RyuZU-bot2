import Discord, { Client, Presence, Game, PresenceData, Message } from 'discord.js';
let fs = require('fs');
require('source-map-support').install();

export interface Cog {
    requires: string[];

    setup: (bot: Bot) => void;
    preinit?: (bot: Bot) => void;
    ready: () => void;
    newGuild: (guild: Discord.Guild) => void;
}

export class Bot {
    constructor(configFile: string) {
        this.ready = false;
        this.loadedCogs = {};
        this.listeners = {};
        let pjson = require('./package.json');
        this.version = pjson.version;

        this.client = new Discord.Client();

        const contents = fs.readFileSync(configFile);
        this.config = JSON.parse(contents);

        let loggerCog: Cog = require('./logger');
        this.loadedCogs['./logger.js'] = loggerCog;
        loggerCog.preinit(this);
    }

    listeners: { [key: string]: (msg: Message) => void };
    config: { [key: string]: any };
    client: Client;
    loadedCogs: { [key: string]: Cog };
    ready: boolean;
    version: string;

    logger: Logger;

    registerCommand(command, func) {
        this.listeners[command] = func;
    }

    loadCog(cogname: string) {
        if (cogname in this.loadedCogs) {
            return;
        }
        try {
            let e: Cog = require(cogname);
            if (Array.isArray(e.requires) && e.requires.length > 0) {
                this.logger.info('Module ' + cogname + ' requires: ' + e.requires);
                for (let i = 0; i < e.requires.length; i++) {
                    this.loadCog(e.requires[i]);
                }
            }
            this.logger.info('Loading ' + cogname + '...');
            e.setup(bot);
            this.loadedCogs[cogname] = e;
        } catch (err) {
            this.logger.error('Failed to load ' + cogname, { err: err });
            process.exit();
        }
    }

    [key: string]: any;
}

export interface Logger {
    info: (message: string | {}, ...args: any[]) => void;
    warn: (message: string | {}, ...args: any[]) => void;
    error: (message: string | {}, ...args: any[]) => void;
}

const coreCogs = ['./admin.js', './util.js'];

let bot = new Bot('config.json');

bot.logger.info('RyuZu ' + bot.version + ' starting up.');

bot.client.on('ready', () => {
    bot.logger.info(`Logged in as ${bot.client.user.tag}! Now readying up!`);
    for (let cogName in bot.loadedCogs) {
        let cog = bot.loadedCogs[cogName];
        if (typeof cog.ready === 'function') {
            bot.logger.info('Readying ' + cogName);
            cog.ready();
        }
    }
    let presence: PresenceData = {
        status: 'online',
        afk: false,
        game: {
            name: bot.config.commandString + ' ' + bot.config.gameMessage + '[' + bot.version + ']',
        }
    };
    bot.client.user.setPresence(presence);
    bot.ready = true;
});

bot.client.on('guildCreate', guild => {
    bot.logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    for (let cogName in bot.loadedCogs) {
        let cog = bot.loadedCogs[cogName];
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
    let command = msg.content.split(' ')[0];
    msg.content = msg.content.substr(command.length + 1, msg.content.length);
    let fn = bot.listeners[command];
    msg.channel.startTyping();
    if (typeof fn === 'function') {
        try {
            await fn(msg);
        } catch (error) {
            bot.logger.error('Command error on input: ' + msg.content, { error });
        }
    } else {
        msg.reply('I don\'t quite know what you want from me... [not a command]');
    }
    msg.channel.stopTyping();
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
