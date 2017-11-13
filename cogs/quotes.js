var lo = require("lodash");
var bot = {};
var server_db = {};
var subcommands = {};

var getCategories = function (db) {
    return db.get('quotes').uniqBy('category').map('category').value();
}

var isCategory = function (db, cat) {
    return getCategories(db).indexOf(cat) > -1
}

var constructQuote = function (quote) {
    return quote.id + "(" + quote.category + "): " + quote.quote;
}

var printQuote = function (msg, quote) {
    msg.channel.send(constructQuote(quote));
}

var randomQuote = function (msg) {
    var db = server_db[msg.guild.id];
    var val = {};
    if (msg.content.length > 0) {
        var cat = msg.content.split(" ")[0];
        if (!isCategory(db, cat)) {
            msg.reply("Not a valid category.");
            return;
        }
        val = db.get('quotes').filter({
            category: cat
        }).shuffle().head().value();
    } else {
        val = db.get('quotes').shuffle().head().value();
    }
    printQuote(msg, val);
}
subcommands["random"] = randomQuote;

var listQuote = function (msg) {
    var db = server_db[msg.guild.id];
    var val = {};
    if (msg.content.length > 0) {
        var cat = msg.content.split(" ")[0];
        if (!isCategory(db, cat)) {
            msg.reply("Not a valid category.");
            return;
        }
        val = db.get('quotes').filter({
            category: cat
        }).value();
    } else {
        val = db.get('quotes').value();
        console.log(val);
    }
    quoteText = val.map((x) => constructQuote(x));
    msg.reply(quoteText.join("\n"));
}
subcommands["list"] = listQuote;

var getQuote = function (msg) {
    var db = server_db[msg.guild.id];
    num = parseInt(msg.content);
    if (isNaN(num)) {
        msg.reply("You need to give a quote number in order to get a quote");
        return;
    }
    var val = db.get('quotes').find({
        id: num
    }).value();
    if (typeof val === 'undefined') {
        msg.reply("Quote not found.");
        return;
    }
    printQuote(msg, val);
}
subcommands["get"] = getQuote;
subcommands["give"] = getQuote;

var deleteQuote = function (msg) {
    var db = server_db[msg.guild.id];
    if (!bot.isMod(msg.channel, msg.author)) {
        msg.reply("You are not allowed to do that");
    }
    num = parseInt(msg.content);
    if (isNaN(num)) {
        msg.reply("You need to give a quote number in order to get a quote");
        return;
    }
    var val = db.get('quotes').find({
        id: num
    }).value();
    if (typeof val === 'undefined') {
        msg.reply("Quote not found.");
        return;
    }
    db.get('quotes').remove({
        id: num
    }).write();
    msg.reply("Quote removed: ");
    printQuote(msg, val);
}
subcommands["delete"] = deleteQuote;
subcommands["remove"] = deleteQuote;

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
    var id = db.get("nextID").value();
    db.get("quotes").push({
        "id": id++,
        "quote": quote,
        "category": category
    }).write();
    db.assign({
        "nextID": id
    }).write();
    msg.reply("Quote added:");
    var val = db.get('quotes').find({
        "id": (id - 1)
    }).value();
    printQuote(msg, val);
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
                nextID: 0
            }).write();
        }
    }
}

var newGuild = function (guild) {
    var db = bot.getCogDB("quotes", guild.id);
    db.defaults({
        quotes: [],
        nextID: 0
    }).write();
    server_db[guild.id] = db;
}

var setup = function (b) {
    bot = b;
    bot.registerCommand("quote", quoteHandler);
}

exports.requires = ["./database.js"];
exports.ready = ready;
exports.setup = setup;
exports.newGuild = newGuild;