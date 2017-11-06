var fs = require("fs");

const datadirectory = "./data/";
const datafile = "live.json";
const datapath = datadirectory + datafile;

var bot = {};
var data = {};
var subcommands = {};

var loadData = function () {
    var contents = fs.readFileSync(datapath);
    data = JSON.parse(contents);
}

var saveData = function () {
    var str = JSON.stringify(data);
    fs.writeFileSync(datapath, str)
}

if(fs.existsSync(datapath))
{
    loadData();
}else{
    if (!fs.existsSync(datadirectory)) {
        fs.mkdirSync(datadirectory);
    }
    data = {"Twitch":{}, "ServerSettings":[]};
    saveData();
}

var addStreamer = function (msg) {
    var command = msg.content.split(" ");
    var server = sg.guild.id;
    var stream = command[0];
    if(typeof command[1] === 'undefined') {
        var level = 1;
    }else{
        var level = command[1];
    }

    if(!(stream in data.twitch))
    {
        data.twitch[stream]=[];
    }
    data.twitch[stream].push({
        "server": server,
        "level": level
    })
    saveData();
    msg.reply("Added streamer to list");
}
subcommands["add"] = getQuote;

var configServer = function (msg) {
    var command = msg.content.split(" ");
    var obj = {
        "server": msg.guild.id,
        "announceChannel": command[0]
    }
    data.ServerSettings.push(obj);
    msg.reply("configured server settings!");
}
subcommands["config"] = getQuote;

var liveHandler = function (msg) {
    var command = msg.content.split(" ")[0];
    msg.content = msg.content.substr(command.length + 1, msg.content.length);
    if (command === "") {
        command = ""
    };
    var fn = subcommands[command];
    if (typeof fn === 'function') {
        fn(msg);
    } else {
        msg.reply("Cannot find subcommand... [" + command + "]");
    }
}

var setup = function (b) {
    bot = b;
    bot.registerCommand("live", liveHandler);
}

exports.requires = [];
exports.setup = setup;