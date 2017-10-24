var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var fs = require('fs');
var bot = {};

const databasesDir = "./databases";
var databases = {};

var loadDB = function (file) {
    var adapter = new FileSync(file);
    var db = low(adapter);
    databases[file] = db;
    return db;
}

var getDB = function (file) {
    if (file in databases) {
        return databases[file];
    }
    return loadDB(file);
}

var getGlobalDB = function (server) {
    var file = databasesDir + "/";
    if (!fs.existsSync(file)) {
        fs.mkdirSync(file);
    }
    var file = file + server + ".json";
    return getDB(file);
}

var getCogDB = function (cogkey, server) {
    var file = databasesDir + "/";
    if (!fs.existsSync(file)) {
        fs.mkdirSync(file);
    }
    var file = file + cogkey + "/";
    if (!fs.existsSync(databasesDir)) {
        fs.mkdirSync(databasesDir);
    }
    var file = file + server + ".json";
    return getDB(file);
}

var setup = function (b) {
    bot = b;
    bot.getGlobalDB = getGlobalDB;
    bot.getCogDB = getCogDB;
}

exports.requires = [];
exports.setup = setup;