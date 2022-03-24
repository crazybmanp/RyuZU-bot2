const bunyan = require('bunyan');
const LoggingBunyan = require('@google-cloud/logging-bunyan').LoggingBunyan;

import { Bot } from './app';

let bot: Bot = null;

let preinit = function (b) {
    bot = b;

    const lb = new LoggingBunyan({
        logName: bot.config.stackdriverName ? bot.config.stackdriverName : 'ryuzu',
    });

    const streams = [
        {
            stream: process.stdout,
            level: 'info'
        },
    ];

    if (!bot.config.devMode) {
        streams.push(lb.stream('info'));
    }

    bot.logger = bunyan.createLogger({
        name: 'RyuZU2',
        streams
    });
};

let setup = function (b) {
    // no setup
};

exports.requires = [];
exports.preinit = preinit;