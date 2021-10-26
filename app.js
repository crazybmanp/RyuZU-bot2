var fs = require("fs");

var bot = {};
const Discord = require("discord.js");
var client = new Discord.Client({ intents: [
"GUILDS",
"GUILD_MEMBERS",
"GUILD_BANS",
"GUILD_EMOJIS_AND_STICKERS",
"GUILD_INTEGRATIONS",
"GUILD_WEBHOOKS",
"GUILD_INVITES",
"GUILD_VOICE_STATES",
"GUILD_PRESENCES",
"GUILD_MESSAGES",
"GUILD_MESSAGE_REACTIONS",
"GUILD_MESSAGE_TYPING",
"DIRECT_MESSAGES",
"DIRECT_MESSAGE_REACTIONS",
"DIRECT_MESSAGE_TYPING",
] });

var contents = fs.readFileSync("config.json");
var config = JSON.parse(contents);

const coreCogs = ["./admin.js", "./util.js"]
var loadedCogs = { "./logger.js": {} };
var listeners = {};

var loggerCog = require('./logger');

var pjson = require('./package.json');
const version = pjson.version;

bot.listeners = listeners;
bot.config = config;
bot.client = client;
bot.loadedCogs = loadedCogs;
bot.ready = false;
loggerCog.preinit(bot);

bot.logger.info("RyuZu " + version + " starting up.")

client.on('ready', async () => {
  bot.logger.info(`Logged in as ${client.user.tag}! Now readying up!`);
  for (var cogName in loadedCogs) {
    cog = loadedCogs[cogName];
    if (typeof cog.ready === 'function') {
      bot.logger.info("Readying " + cogName);
      await cog.ready();
    }
  }
  var presence = {
    name: config.commandString + " " + config.gameMessage + "[" + version + "]"
  }
  bot.client.user.setActivity(presence);
  bot.ready = true;
  bot.logger.info("RyuZu " + version + " ready!");
});

client.on("guildCreate", guild => {
  bot.logger.info(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  for (var cogName in loadedCogs) {
    cog = loadedCogs[cogName];
    if (typeof cog.newGuild === 'function') {
      bot.logger.info("Notifying " + cogName + " of new guild.");
      cog.newGuild(guild);
    }
  }
});

client.on('message', async msg => {
  if (!bot.ready) {
    bot.logger.warn("BOT RECIEVED MESSAGE BEFORE READY COMPLETED");
    return;
  }
  if (!msg.content.startsWith(config.commandString)) {
    return;
  }
  msg.content = msg.content.substr(config.commandString.length, msg.content.length);
  var command = msg.content.split(" ")[0];
  msg.content = msg.content.substr(command.length + 1, msg.content.length);
  var fn = listeners[command];
  msg.channel.sendTyping();
  if (typeof fn === 'function') {
    try {
      let ret = fn(msg);
      if (ret?.then??false) {
        await ret;
      }
    } catch (error) {
      bot.logger.error("Command error on input: " + msg.content, { error });
    }
  } else {
    msg.reply("I don't quite know what you want from me... [not a command]");
  }
  
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
      bot.logger.info("Module " + cogname + " requires: " + e.requires);
      for (var i = 0; i < e.requires.length; i++) {
        bot.loadCog(e.requires[i]);
      }
    }
    bot.logger.info("Loading " + cogname + "...");
    e.setup(bot);
    loadedCogs[cogname] = e;
  } catch (err) {
    bot.logger.error("Failed to load " + cogname, {err: err});
    process.exit();
  }
}

//-----------
//Begin Setup
//-----------

//register base commands
bot.registerCommand("ping", async function (msg) {
  await msg.reply('Pong!');
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
