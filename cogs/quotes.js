var bot = {};

var server_db = {};

var setup = function (b) {
    bot = b;
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
    bot.registerCommand("quote", quoteHandler);
}

exports.requires = ["./database.js"];
exports.ready = ready;
exports.setup = setup;