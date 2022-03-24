import { Bot } from '../app';

let bot: Bot;
let serverDb: any = {};
let subcommands: any = {};

let getCategories = function (db) {
    return db.get('quotes').uniqBy('category').map('category').value();
};

let isCategory = function (db, cat) {
    return getCategories(db).indexOf(cat) > -1;
};

let constructQuote = function (quote): string {
    return quote.id + '(' + quote.category + '): ' + quote.quote;
};

let printQuote = function (msg, quote) {
    msg.channel.send(constructQuote(quote));
};

let randomQuote = function (msg) {
    let db = serverDb[msg.guild.id];
    let val = {};
    if (msg.content.length > 0) {
        let cat = msg.content.split(' ')[0];
        if (!isCategory(db, cat)) {
            msg.reply('Not a valid category.');
            return;
        }
        val = db.get('quotes').filter({
            category: cat
        }).shuffle().head().value();
    } else {
        val = db.get('quotes').shuffle().head().value();
    }
    printQuote(msg, val);
};
subcommands.random = randomQuote;

let listQuote = function (msg) {
    let db = serverDb[msg.guild.id];
    let val: { [key: string]: any }[] = null;
    if (msg.content.length > 0) {
        let cat = msg.content.split(' ')[0];
        if (!isCategory(db, cat)) {
            msg.reply('Not a valid category.');
            return;
        }
        val = db.get('quotes').filter({
            category: cat
        }).value();
    } else {
        val = db.get('quotes').value();
    }
    let quoteText: string = val.map((x) => constructQuote(x)).join('\n');

    if (quoteText.length < 1) {
        msg.reply('found no quotes...');
        return;
    }

    bot.printLong(msg.channel, quoteText);
};
subcommands.list = listQuote;

let getQuote = function (msg) {
    let db: any = serverDb[msg.guild.id];
    let num: number = parseInt(msg.content);
    if (isNaN(num)) {
        msg.reply('You need to give a quote number in order to get a quote');
        return;
    }
    let val = db.get('quotes').find({
        id: num
    }).value();
    if (typeof val === 'undefined') {
        msg.reply('Quote not found.');
        return;
    }
    printQuote(msg, val);
};
subcommands.get = getQuote;
subcommands.give = getQuote;

let deleteQuote = function (msg) {
    let db = serverDb[msg.guild.id];
    if (!bot.isMod(msg.channel, msg.author)) {
        msg.reply('You are not allowed to do that');
    }
    let num: number = parseInt(msg.content);
    if (isNaN(num)) {
        msg.reply('You need to give a quote number in order to get a quote');
        return;
    }
    let val = db.get('quotes').find({
        id: num
    }).value();
    if (typeof val === 'undefined') {
        msg.reply('Quote not found.');
        return;
    }
    db.get('quotes').remove({
        id: num
    }).write();
    msg.reply('Quote removed: ');
    printQuote(msg, val);
};
subcommands.delete = deleteQuote;
subcommands.remove = deleteQuote;

let addQuote = function (msg) {
    let splt = msg.content.split('"');
    let supersplit = [];
    splt.forEach(function (element) {
        supersplit.push(element.split(' '));
    }, this);
    supersplit.forEach(function (element, i, arr) {
        arr[i] = element.filter(Boolean);
    }, this);

    if (supersplit.length < 2) {
        msg.reply('Usage: specify the quote in quotations, with one word before or after to specify its category');
        return;
    }
    if (supersplit[0].length + supersplit[2].length > 1) {
        msg.reply('Usage: specify the quote in quotations, with one word before or after to specify its category');
        return;
    }

    let category = '';
    if (supersplit[0].length === 1) {
        category = supersplit[0][0];
    } else {
        category = supersplit[2][0];
    }
    let quote = supersplit[1].join(' ');
    let db = serverDb[msg.guild.id];
    let id = db.get('nextID').value();
    db.get('quotes').push({
        'id': id++,
        'quote': quote,
        'category': category
    }).write();
    db.assign({
        'nextID': id
    }).write();
    msg.reply('Quote added:');
    let val = db.get('quotes').find({
        'id': (id - 1)
    }).value();
    printQuote(msg, val);
};
subcommands.add = addQuote;

let quoteHandler = function (msg) {
    let command = msg.content.split(' ')[0];
    msg.content = msg.content.substr(command.length + 1, msg.content.length);
    if (command === '') {
        command = 'random';
    }
    let fn = subcommands[command];
    if (typeof fn === 'function') {
        fn(msg);
    } else {
        msg.reply('Cannot find subcommand... [' + command + ']');
    }
};

let ready = function () {
    bot.logger.info('Quote - Mounting DBs');
    serverDb = bot.getAllCogDBs('quotes');
    for (let dbname in serverDb) {
        let db = serverDb[dbname];
        if (!db.has('quotes').value()) {
            bot.logger.info('Setting up new server');
            db.defaults({
                quotes: [],
                nextID: 0
            }).write();
        }
    }
};

let newGuild = function (guild) {
    let db = bot.getCogDB('quotes', guild.id);
    db.defaults({
        quotes: [],
        nextID: 0
    }).write();
    serverDb[guild.id] = db;
};

let GiveQuoteSupport = function (guild, num) {
    let db = serverDb[guild.id];
    let ret = {};
    if (num == null) {
        ret = db.get('quotes').shuffle().head().value();
    } else {
        ret = db.get('quotes').find({
            id: num
        }).value();
    }
    return JSON.parse(JSON.stringify(ret));
};

let setup = function (b) {
    bot = b;
    bot.giveQuote = GiveQuoteSupport;
    bot.registerCommand('quote', quoteHandler);
};

exports.requires = ['./database.js', './util.js'];
exports.ready = ready;
exports.setup = setup;
exports.newGuild = newGuild;