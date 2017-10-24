var bot = {};

var server_db = {};

var setup = function (b) {
    bot = b;
}

var ready = function () {
    console.log("Quote - Mounting DBs");
    sever_db = bot.getAllCogDBs("quotes");
}

exports.requires = ["./database.js"];
exports.ready = ready;
exports.setup = setup;