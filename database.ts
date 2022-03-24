import low from 'lowdb';
let FileSync = require('lowdb/adapters/FileSync');
let fs = require('fs');
import { Bot } from './app';

let bot: Bot;

const databasesDir = './databases';
let databases = {};

let loadDB = function (file) {
    let adapter = new FileSync(file);
    let db = low(adapter);
    databases[file] = db;
    return db;
};

let getDB = function (file) {
    if (file in databases) {
        return databases[file];
    }
    return loadDB(file);
};

let getGlobalDB = function (server) {
    let file = databasesDir + '/';
    if (!fs.existsSync(file)) {
        fs.mkdirSync(file);
    }
    file = file + server + '.json';
    return getDB(file);
};

let getCogDB = function (cogkey, server) {
    let file = databasesDir + '/';
    if (!fs.existsSync(file)) {
        fs.mkdirSync(file);
    }
    file = file + cogkey + '/';
    if (!fs.existsSync(file)) {
        fs.mkdirSync(file);
    }
    file = file + server + '.json';
    return getDB(file);
};

let getAllCogDBs = function (cogkey) {
    let dbs = {};
    let servers = bot.client.guilds;
    for (let mel of servers) {
        let guildid = mel[1].id;
        dbs[guildid] = getCogDB(cogkey, guildid);
    }
    return dbs;
};

let setup = function (b) {
    bot = b;
    bot.getGlobalDB = getGlobalDB;
    bot.getCogDB = getCogDB;
    bot.getAllCogDBs = getAllCogDBs;
};

exports.requires = [];
exports.setup = setup;