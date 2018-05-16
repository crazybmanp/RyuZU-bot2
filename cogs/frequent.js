var lo = require("lodash");
var fs = require('fs');
var bot = {};
var server_cfg = {};
var cogkey = "frequent";

var getConfig = function (guild) {
    if (server_cfg[guild.id] == null) {
        server_cfg[guild.id] = bot.config.getConfig(cogkey, guild.id);
        if (server_cfg[guild.id].users == null) {
            server_cfg[guild.id].users = {};
            saveOutConfig(guild);
        }
    }
    return server_cfg[guild.id];
}

var saveOutConfig = function (guild) {
    bot.config.saveConfig(cogkey, guild.id, server_cfg[guild.id]);
}

var isEnabled = function (guild) {
    return getConfig(guild).enabled;
};

var logListener = function (msg) {
    if (!isEnabled(msg.guild)) {
        return;
    }

    var users = getConfig(msg.guild).users;
    if (users[msg.author.id] == null) {
        var dat = {};
        dat.user = msg.author.username + "#" + msg.author.discriminator;
        dat.freq = 0;
        dat.messagesToday = 0;
        dat.lastMesssage = Date.now();
        users[msg.author.id] = dat;
    }
    var user = users[msg.author.id];
    user.messagesToday += 1;
    user.lastMesssage = Date.now();

    saveOutConfig(msg.guild);

    var data = {}
    data.content = msg.content;
    data.author = msg.author.id;
    data.user = msg.author.username + "#" + msg.author.discriminator;
    data.time = msg.createdAt;
    fs.appendFileSync('data/' + msg.guild.id + '.json', ",\n" + JSON.stringify(data));
};

var config_enablelogging = function (msg) {
    var config = getConfig(msg.guild);
    config.enabled = (msg.content == "t");
    saveOutConfig(msg.guild);
};

var ready = function () {
    console.log(cogkey + " - Mounting DBs");
    var servers = bot.client.guilds;
    for (var mel of servers) {
        var guild = {}
        guild.id = mel[1].id;
        getConfig(guild);
    }
}

var newGuild = function (guild) {
    getConfig(guild);
}

var setup = function (b) {
    bot = b;
    bot.registerListener("frequent", logListener);
    bot.registerCommand("frequent.enable", config_enablelogging);
};

exports.requires = ["./serverConfig.js"];
exports.ready = ready;
exports.setup = setup;
exports.newGuild = newGuild;