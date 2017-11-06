var fs = require("fs");

const datadirectory = "./data/";
const datafile = "live.json";
const datapath = datadirectory + datafile;

var bot = {};
var data = {};

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
    data = {"Twitch":[], "ServerSettings":[]};
    saveData();
}



var setup = function (b) {
    bot = b;
    // bot.registerCommand("ping", function (msg) {
    //     msg.reply('Pong!')
    // });
}

exports.requires = [];
exports.setup = setup;