var fs = require('fs');
var bot = {};

const configDir = "./config";
var configs = {};

var loadConfigLow = function (file) {
    db = require(file);
    databases[file] = db;
    return db;
}

var saveConfigLow = function (file, data) {
    configs[file] = JSON.parse(JSON.stringify(data));
    fs.writeFile(file, configs[file]);
}

var makeFileName = function (cogkey, server) {
    var file = configDir + "/" + cogkey;
    !fs.existsSync(file) && fs.mkdirSync(file);
    return file + "/" + server + ".json";
}

var getConfig = function (cogkey, server) {
    var file = makeFileName(cogkey, server);
    if (file in configs) {
        return configs[file];
    }
    return loadConfigLow(file);
}

var saveConfig = function (cogkey, server, data) {
    var file = makeFileName(cogkey, server);
    saveConfigLow(file, data);
}

var config = {}; //subfunction for bot
var setup = function (b) {
    bot = b;
    !fs.existsSync(configDir) && fs.mkdirSync(configDir);
    bot.config = config;
    bot.config.saveConfig = saveConfig;
    bot.config.getConfig = getConfig;
}

exports.requires = [];
exports.setup = setup;
exports.saveConfig = saveConfig;