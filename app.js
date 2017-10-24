var fs = require("fs");

var bot = {};
const Discord = require("discord.js");
var client = new Discord.Client();

var contents = fs.readFileSync("config.json");
var config = JSON.parse(contents);

coreCogs = ["./Admin.js"]
loadedCogs = [];
listeners = {};

bot.listeners = listeners;
bot.config = config;
bot.client = client;

Array.prototype.contains = function(element){
  return this.indexOf(element) > -1;
};

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

bot.loadCog = function(cogname)
{
  if(loadedCogs.contains(cogname)){console.log(cogname + " is already loaded."); return;}
  try {
    e = require(cogname);
    if(Array.isArray(e.requires) && e.requires.length>0)
    {
      console.log("Module "+cogname+" requires: "+e.requires);
      for(var i=0; i<e.requires.length; i++)
      {
        bot.loadCog(e.requires[i]);
      }
    }
    e.setup(bot);
    loadedCogs.push(cogname);
    console.log(cogname + " loaded.");
  } catch (err) {
    console.log("failed to load " + cogname);
    process.exit();
  }
}

//-----------
//Begin Setup
//-----------

//register base commands
bot.registerCommand("ping", function(msg){msg.reply('Pong!')});

//Load Core Cogs
coreCogs.forEach(function(element) {
  bot.loadCog(element);
}, this);

//Load Startup Cogs
config.startupExtensions.forEach(function(element) {
  bot.loadCog(element);
}, this);

//start the client
client.login(config.token);