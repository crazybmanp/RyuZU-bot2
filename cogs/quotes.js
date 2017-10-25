var lo = require("lodash");
var bot = {};
var server_db = {};
var subcommands = {};

var randomQuote = function (msg) {
    var db = server_db[msg.guild.id];
    var val = db.get('quotes').shuffle().head().value();
    console.log(val);
    msg.reply(val.category + ": "+val.quote);
};
subcommands["random"] = randomQuote;

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