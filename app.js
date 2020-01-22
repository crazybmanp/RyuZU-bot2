var fs = require("fs");

var bot = {};
const Discord = require("discord.js");
var client = new Discord.Client();

var contents = fs.readFileSync("config.json");
var config = JSON.parse(contents);

const coreCogs = ["./admin.js", "./util.js"]
var loadedCogs = {};
var listeners = {};

var pjson = require('./package.json');
const version = pjson.version;

var logger = require('./logger');

logger.info("RyuZu " + version + " starting up.")

bot.listeners = listeners;
bot.config = config;
bot.client = client;
bot.loadedCogs = loadedCogs;
bot.ready = false;

client.on('ready', () => {
  logger.info(`Logged in as ${client.user.tag}! Now readying up!`);
  for (var cogName in loadedCogs) {
    cog = loadedCogs[cogName];
    if (typeof cog.ready === 'function') {
      logger.info("Readying " + cogName);
      cog.ready();
    }
  }
  var presence = {
    status: "online",
    afk: false,
    game: {
      name: config.commandString + " " + config.gameMessage + "[" + version + "]",
    }
  }
  bot.client.user.setPresence(presence);
  bot.ready = true;
});

client.on("guildCreate", guild => {
  logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  for (var cogName in loadedCogs) {
    cog = loadedCogs[cogName];
    if (typeof cog.newGuild === 'function') {
      logger.info("Notifying " + cogName + " of new guild.");
      cog.newGuild(guild);
    }
  }
});

client.on('message', msg => {
  if (!bot.ready) {
    logger.warn("BOT RECIEVED MESSAGE BEFORE READY COMPLETED");
    return;
  }
  if (!msg.content.startsWith(config.commandString)) {
    return;
  }
  msg.content = msg.content.substr(config.commandString.length, msg.content.length);
  var command = msg.content.split(" ")[0];
  msg.content = msg.content.substr(command.length + 1, msg.content.length);
  var fn = listeners[command];
  msg.channel.startTyping();
  if (typeof fn === 'function') {
    try {
      fn(msg)
    } catch (error) {
      logger.error("Command error on input: " + msg.content, { error });
    }
  } else {
    msg.reply("I don't quite know what you want from me... [not a command]");
  }
  msg.channel.stopTyping();
});

bot.registerCommand = function (command, func) {
  bot.listeners[command] = func;
}

bot.loadCog = function (cogname) {
  if (cogname in loadedCogs) {
    return;
  }
  try {
    var e = require(cogname);
    if (Array.isArray(e.requires) && e.requires.length > 0) {
      logger.info("Module " + cogname + " requires: " + e.requires);
      for (var i = 0; i < e.requires.length; i++) {
        bot.loadCog(e.requires[i]);
      }
    }
    logger.info("Loading " + cogname + "...");
    e.setup(bot);
    loadedCogs[cogname] = e;
  } catch (err) {
    logger.error("failed to load " + cogname);
    process.exit();
  }
}

//-----------
//Begin Setup
//-----------

//register base commands
bot.registerCommand("ping", function (msg) {
  msg.reply('Pong!')
});

//Load Core Cogs
coreCogs.forEach(function (element) {
  bot.loadCog(element);
}, this);

//Load Startup Cogs
config.startupExtensions.forEach(function (element) {
  bot.loadCog(element);
}, this);

//start the client
client.login(config.token);