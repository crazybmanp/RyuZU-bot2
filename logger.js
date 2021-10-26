const bunyan = require('bunyan');
const LoggingBunyan = require('@google-cloud/logging-bunyan').LoggingBunyan;

var bot = {};

var preinit = function (b) {
  bot = b;

  const lb = new LoggingBunyan({
    logName: bot.config.stackdriverName ? bot.config.stackdriverName : 'ryuzu',
  });
  
  const streams = [
    {
      stream: process.stdout,
      level: bot.config.devMode ? 'debug' : 'info'
    },
  ];

  if (!bot.config.devMode) {
    streams.push(lb.stream('info'));
  }

  bot.logger = bunyan.createLogger({
    name: 'RyuZU2',
    streams
  });
}

exports.requires = [];
exports.preinit = preinit;