var fs = require("fs");

var bot = {};
const Discord = require("discord.js");
var client = new Discord.Client();

var contents = fs.readFileSync("config.json");
var config = JSON.parse(contents);

coreCogs = ["./Admin.js"]
listeners = {};

bot.listeners = listeners;
bot.config = config;
bot.client = client;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if(!msg.content.startsWith(config.commandString)){return; }
  msg.content = msg.content.substr(config.commandString.length, msg.content.length);
  var command = msg.content.split(" ")[0];
  msg.content = msg.content.substr(command.length + 1, msg.content.length);
  var fn = listeners[command];
  if(typeof fn === 'function')
  {
    fn(msg);
  } else {
    msg.reply("I don't know quite know what you want from me... [not a command]");
  }
});

bot.registerCommand = function(command, func){
  bot.listeners[command] = func;
}

//-----------
//Begin Setup
//-----------

//register base commands
bot.registerCommand("ping", function(msg){msg.reply('Pong!')});

//Load Core Cogs
coreCogs.forEach(function(element) {
  try {
    e = require(element)
    e.setup(bot)
  } catch (err) {
    failure="failed to load" + element;
  }
}, this);

//Load Startup Cogs
config.startupExtensions.forEach(function(element) {
  try {
    e = require(element)
    e.setup(bot)
  } catch (err) {
    failure="failed to load" + element;
  }
}, this);

//start the client
client.login(config.token);