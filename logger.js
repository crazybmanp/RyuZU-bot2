const bunyan = require('bunyan');
const LoggingBunyan = require('@google-cloud/logging-bunyan').LoggingBunyan;

const lb = new LoggingBunyan({
  logName: 'ryuzu'
});

const streams = [
  {
    stream: process.stdout,
    level: 'info'
  },
  lb.stream('info')
]

module.exports = bunyan.createLogger({
  name: 'RyuZU2',
  streams
});