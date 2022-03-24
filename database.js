const { createConnection } = require("typeorm");
var typeorm = require("typeorm");
const { default: Model } = require("./Model");
var bot = {};



var setup = function (b) {
    bot = b;
    var datasource = new typeorm.DataSource({
        synchronize: true,
        entities: [Model],
        ...bot.config.database
    });
    bot.logger.info("Connecting to database...");
    await datasource.initialize()
    .then(() => {
        bot.logger.info("Data Source has been initialized!")
    })
    .catch((err) => {
        bot.logger.err("Error during Data Source initialization", err)
    })
    await datasource.synchronize();
    bot.datasource = datasource;
}

exports.requires = [];
exports.setup = setup;