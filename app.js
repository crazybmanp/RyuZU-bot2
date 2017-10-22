var fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

var contents = fs.readFileSync("config.json");
var Config = JSON.parse(contents);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

listeners = {ping: function(msg){msg.reply('Pong!');}};

client.on('message', msg => {
  if(!msg.content.startsWith(Config.commandString)){return; }
  msg.content = msg.content.substr(Config.commandString.length, msg.content.length);
  for(var key in listeners)
  {
    if(msg.content.startsWith(key)){
      listeners[key](msg);
    }
  }
});

client.login(Config.token);