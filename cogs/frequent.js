var lo = require("lodash");
var schedule = require('node-schedule');
var fs = require('fs');
var bot = {};
var server_cfg = {};
var cogkey = "frequent";
var fs = require('fs');

function round(number, precision) {
    if (precision == null) {
        precision = 0
    }
    var exponent = 0;
    var shift = function (number, exponent) {
        var numArray = ("" + number).split("e");
        return +(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + precision) : precision));
    };
    return shift(Math.round(shift(number, +exponent)), -exponent);
}

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
        dat.averageMessagesPerDay = 0;
        dat.charactersToday = 0;
        dat.messagesToday = 0;
        dat.lastMesssage = Date.now();
        users[msg.author.id] = dat;
    }
    var user = users[msg.author.id];
    user.charactersToday += msg.content.length;
    user.messagesToday += 1;
    user.lastMesssage = Date.now();

    saveOutConfig(msg.guild);
};

var config_enablelogging = function (msg) {
    if (!bot.isMod(msg.channel, msg.author)) {
        msg.reply("You are not allowed to do that");
    }
    var config = getConfig(msg.guild);
    config.enabled = (msg.content == "t");
    saveOutConfig(msg.guild);
};

var audit = function () {
    var servers = bot.client.guilds;
    for (var mel of servers) {
        var guild = {}
        guild.id = mel[1].id;
        cfg = getConfig(guild);
        if (cfg.enabled) {
            var uks = Object.keys(cfg.users);
            for (var uk of uks) {
                var user = cfg.users[uk];
                user.freq = (user.freq * .9) + (user.charactersToday * .1);
                user.averageMessagesPerDay = (user.averageMessagesPerDay * .9) + (user.messagesToday * .1);
                user.charactersToday = 0;
                user.messagesToday = 0;
            }
            fs.appendFileSync('data/' + msg.guild.id + '.json', ",\n" + JSON.stringify(cfg));
        }
        cfg.lastStats = Date.now();
        saveOutConfig(guild);
    }
}

var topStats = function (msg) {
    var users = getConfig(msg.guild).users;
    var susers = [];
    for (var u in users) {
        susers.push(users[u]);
    }

    susers.sort(function (a, b) {
        return b.freq - a.freq;
    })

    var m = "Top Users:"
    for (var i = 0; i < susers.length; i++) {
        m = m + "\n" + (i + 1).toString() + ": **" + susers[i].user + "**\t freq score: " + round(susers[i].freq);
    }

    msg.channel.send(m);
}

var stats = function (msg) {
    uid = msg.guild.members.find(val => val.user.username.toLowerCase() == msg.content).id;
    var users = getConfig(msg.guild).users;

    user = users[uid];
    var lastSeen = new Date(user.lastMesssage);
    const embed = {
        "title": user.user,
        "description": "User Stats",
        "color": 9942527,
        "timestamp": "2018-05-18T01:49:30.903Z",
        "footer": {
            "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
            "text": "Ryuzu Bot"
        },
        "fields": [{
                "name": "Average Characters per Day",
                "value": round(user.freq).toString(),
                "inline": true
            },
            {
                "name": "Characters Today",
                "value": user.charactersToday.toString(),
                "inline": true
            },
            {
                "name": "Average Messages per Day",
                "value": round(user.averageMessagesPerDay).toString(),
                "inline": true
            },
            {
                "name": "Messages Today",
                "value": user.messagesToday.toString(),
                "inline": true
            },
            {
                "name": "Last Seen",
                "value": lastSeen.toTimeString() + "\n" + lastSeen.toDateString()
            }
        ]
    };
    msg.channel.send({
        embed
    });
}

var statjob = {};
var ready = function () {
    console.log(cogkey + " - Mounting DBs");
    var servers = bot.client.guilds;
    for (var mel of servers) {
        var guild = {}
        guild.id = mel[1].id;
        getConfig(guild);
    }
    statjob = schedule.scheduleJob('0 0 * * *', audit);
}

var newGuild = function (guild) {
    getConfig(guild);
}

var setup = function (b) {
    bot = b;
    bot.registerListener("frequent", logListener);
    bot.registerCommand("freq.enable", config_enablelogging);
    bot.registerCommand("freq.stats", stats);
    bot.registerCommand("freq.top", topStats);
};

exports.requires = ["./serverConfig.js"];
exports.ready = ready;
exports.setup = setup;
exports.newGuild = newGuild;