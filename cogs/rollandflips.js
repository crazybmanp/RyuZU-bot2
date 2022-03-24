const { MessageEmbed } = require("discord.js");

var bot = {};
var subcommands = {};

var RollGenericDice = function (numberOfDice, numberOfSides) {
    var results = {
        total: 0,
        rolls: []
    }
    for (var i = 0; i < numberOfDice; i++) {
        var roll = Math.floor(Math.random() * numberOfSides) + 1;
        results.rolls.push(roll);
        results.total += roll;
    }
    return results;
}

var RollDice = function (msg) {
    // regex to split a string into an array of blank dice number or number dice number
    var regex = /(\d+)?d(\d+)/g;
    var dice = msg.content.match(regex);
    if (dice == null) {
        return;
    }
    var rollResults = [];
    var total = 0;
    for (var i = 0; i < dice.length; i++) {
        var die = dice[i].split('d');
        var numDice = die[0] == '' ? 1 : parseInt(die[0]);
        var numSides = parseInt(die[1]);
        rollResults.push(RollGenericDice(numDice, numSides));
    }
    var resultMessages = [];
    for (var i = 0; i < rollResults.length; i++) {
        var result = rollResults[i];
        total += result.total;
        resultMessages.push("Rolled ");
        for (var j = 0; j < result.rolls.length; j++) {
            resultMessages.push(result.rolls[j] + ", ");
        }
        resultMessages.push(" for a total of " + result.total + "\n");
    }
    bot.printLong(msg.channel, resultMessages);
    msg.channel.send("Grand Total: " + total);
}
subcommands["roll"] = {function: RollDice, description: "Rolls a generic set of dice, outputs results of individual rolls and total. Format: roll 5d6 10d500 30d70"};

var CoinFlip = function (msg) {
    var coin = Math.floor(Math.random() * 2);
    if (coin == 0) {
        msg.channel.send("Heads");
    } else {
        msg.channel.send("Tails");
    }
}
subcommands["coinflip"] = {function: CoinFlip, description: "Flips a coin."};

var subCommands = function (msg) {
    var embed = new MessageEmbed()
    .setTitle("Roll")
    .setDescription("Rolls a generic dice.")
    for(var command in subcommands){
        embed.addField(command, subcommands[command].description);
    }
}

var rollHandler = function (msg) {
    var command = msg.content.split(" ")[0];
    msg.content = msg.content.substr(command.length + 1, msg.content.length);
    if (command === "") {
        command = "roll"; //this is the default command to be used if no command is specified
    };
    var fn = subcommands[command].function;
    if (typeof fn === 'function') {
        fn(msg);
    } else {
        msg.reply("Cannot find subcommand... [" + command + "]");
    }
}

var ready = async function () {
}

var setup = function (b) {
    bot = b;
    bot.random = {RollGenericDice};
    bot.registerCommand("rollsandflips", rollHandler);
    bot.registerCommand("roll", RollDice);
    bot.registerCommand("coinflip", CoinFlip);
}

exports.ready = ready;
exports.setup = setup;