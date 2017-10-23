var fs = require("fs");

var bot = {};
const Discord = require("discord.js");
var client = new Discord.Client();

var contents = fs.readFileSync("config.json");
var config = JSON.parse(contents);

coreCogs = ["./Admin.js"]
listeners = {ping: function(msg){msg.reply('Pong!');}};

bot.listeners = listeners;
bot.config = config;
bot.client = client;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if(!msg.content.startsWith(config.commandString)){return; }
  msg.content = msg.content.substr(config.commandString.length, msg.content.length);
  console.log(bot.listeners);
  for(var key in listeners)
  {
    if(msg.content.startsWith(key)){
      listeners[key](msg);
    }
  }
});

bot.registerCommand = function(command, func){
  bot.listeners[command] = func;
}

coreCogs.forEach(function(element) {
  try {
    e = require(element)
    e.setup(bot)
  } catch (err) {
    failure="failed to load" + element;
  }
}, this);

config.startupExtensions.forEach(function(element) {
  try {
    e = require(element)
    e.setup(bot)
  } catch (err) {
    failure="failed to load" + element;
  }
}, this);

client.login(config.token);