var lo = require("lodash");
var bot = {};
var server_db = {};
var subcommands = {};

var randomQuote = function (msg) {
    var db = server_db[msg.guild.id];
    var val = db.get('quotes').shuffle().head().value();
    console.log(val);
    msg.reply(val.category + ": " + val.quote);
}
subcommands["random"] = randomQuote;

var addQuote = function (msg) {
    var splt = msg.content.split("\"");
    var supersplit = [];
    splt.forEach(function (element) {
        supersplit.push(element.split(" "));
    }, this);
    supersplit.forEach(function (element, i, arr) {
        arr[i] = element.filter(Boolean);
    }, this);

    if (supersplit.length < 2) {
        msg.reply("Usage: specify the quote in quotations, with one word before or after to specify its category");
        return;
    }
    if (supersplit[0].length + supersplit[2].length > 1) {
        msg.reply("Usage: specify the quote in quotations, with one word before or after to specify its category");
        return;
    }

    var category = "";
    if (supersplit[0].length == 1) {
        category = supersplit[0][0];
    } else {
        category = supersplit[2][0];
    }
    var quote = supersplit[1].join(" ");
    var db = server_db[msg.guild.id];
    db.get("quotes").push({
        "quote": quote,
        "category": category
    }).write();
    msg.reply("Quote added!");
}
subcommands["add"] = addQuote;

var quoteHandler = function (msg) {
    var command = msg.content.split(" ")[0];
    msg.content = msg.content.substr(command.length + 1, msg.content.length);
    if (command === "") {
        command = "random"
    };
    var fn = subcommands[command];
    if (typeof fn === 'function') {
        fn(msg);
    } else {
        msg.reply("Cannot find subcommand... [" + command + "]");
    }
}

var ready = function () {
    console.log("Quote - Mounting DBs");
    server_db = bot.getAllCogDBs("quotes");
    for (var dbname in server_db) {
        db = server_db[dbname];
        if (!db.has('quotes').value()) {
            console.log("Setting up new server");
            db.defaults({
                quotes: [],
                categories: []
            }).write();
        }
    }
}

var setup = function (b) {
    bot = b;
    bot.registerCommand("quote", quoteHandler);
}

exports.requires = ["./database.js"];
exports.ready = ready;
exports.setup = setup;