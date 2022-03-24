const Logger = require("bunyan");
const { MessageEmbed } = require("discord.js");

var bot = {};
var gamesList = {};

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

var verifyBet = function (msg, bet) {
    var points = bot.points.getPointsForUser(msg.guild.id, msg.author.id);
    if (bet > points) {
        return false;
    }
    return true;
}

//var symbols = ["<:DeWay:434838591064244235>", "<a:ChikaHappy:639255151458254858>", "<a:ChaikaEyebrows:639250646419243033>"];
var symbols = [
    {
        symbol: "🍊",
        value: 1
    },
    {
        symbol: "🍋",
        value: 10
    },
    {
        symbol: "🍒",
        value: 50
    },
    {
        symbol: "🍇",
        value: 2
    },
    {
        symbol: "🍉",
        value: 1
    },
    {
        symbol: "🍓",
        value: 1
    },
    {
        symbol: "🍑",
        value: 10
    },
    {
        symbol: "🍌",
        value: 1
    },
    {
        symbol: "💩",
        value: 0,
        shortCircuit: true
    }
]
var getRandomWheel = function(){
    var wheel = JSON.parse(JSON.stringify(symbols));
    for (let i = wheel.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wheel[i], wheel[j]] = [wheel[j], wheel[i]];
    }
    return wheel;
}
var generateSlots = function(size){
    var slots = [];
    for(var i = 0; i < size; i++){
        slots[i]=[];
    }

    for(var i = 0; i < size; i++){
        var wheel = getRandomWheel();
        var position = getRandomInt(symbols.length);
        for(var j = 0; j < size; j++){
            slots[j][i] = wheel[position].symbol;
            position++;
            position %= wheel.length;
        }
    }
    return slots;
}

var printSlots = function(slots){
    var s = "";
    for(var i = 0; i < slots.length; i++){
        for(var j = 0; j < slots[i].length; j++){
            s += slots[i][j] + " ";
        }
        s += "\n";
    }
    return s;
}

var scoreSlots3 = function (slots){
    var score = 0;
    var description = [];
    var levelOfWin = 0;
    for(var i = 0; i< slots.length; i++){
        var row = slots[i];
        if(row[0] == row[1] && row[1] == row[2]){
            var symbol = symbols.find(x => x.symbol == slots[i][0]);
            if(symbol.shortCircuit){
                return [0, ["💩 ruins everything!"], -1];
            }
            description.push("Row "+ i +" win! "+symbol.symbol);
            levelOfWin = Math.max(levelOfWin, 1);
            score += symbol.value;
        }

    }
    if(slots[0][0] == slots[1][1] && slots[1][1] == slots[2][2]){
        var symbol = symbols.find(x => x.symbol == slots[0][0]);
        if(symbol.shortCircuit){
            return [0, ["💩 ruins everything!"], -1];
        }
        description.push("Diagonal win! "+symbol.symbol);
        levelOfWin = Math.max(levelOfWin, 1);
        score += symbol.value;
    }
    if(slots[0][3] == slots[1][1] && slots[1][1] == slots[2][0]){
        var symbol = symbols.find(x => x.symbol == slots[0][3]);
        if(symbol.shortCircuit){
            return [0, ["💩 ruins everything!"], -1];
        }
        description.push("Diagonal win! "+symbol.symbol);
        levelOfWin = Math.max(levelOfWin, 1);
        score += symbol.value;
    }
    return [score, description, levelOfWin];
}

const SlotMax = Number.MAX_VALUE;
const SlotMin = 5;
var Slots = function(msg){    
    var bet = msg.content.split(" ")[0];
    if(bet===""){
        msg.reply("You need to bet something!");
        return;
    }
    if(bet<SlotMin || bet>SlotMax)
    {
        msg.reply("Bet must be between "+SlotMin+" and "+SlotMax);
        return;
    }
    if (!verifyBet(msg, bet)) {
        msg.reply("You do not have enough points to bet that much.");
        return;
    }

    // var size = number(msg.content.split(" ")[1]);
    // if(isNan(size) || size === undefined){
    //     size = 3;
    // }

    var slots = generateSlots(3);
    var [score, description, levelOfWin] = scoreSlots3(slots);

    if(levelOfWin > 0){
        winnings = bet * score;
    }else{
        winnings = -bet;
    }

    msg.reply(printSlots(slots));
    msg.reply(description.join("\n") + "\n" + (levelOfWin === 1 ? "🎉 " : "") + "Score: " + score + (levelOfWin === 1 ? " 🎉" : "") + "\n" + "Winnings: " + winnings);
    bot.points.addPointsForUser(msg.guild.id, msg.author.id, winnings, "Casino - Slots");

    if(winnings < 0)
    {
        bot.achievments.incrementUserStat(msg.guild.id, msg.author.id, "Casino - Slot Losses", -winnings);
        if(bot.achievments.getUserStat(msg.guild.id, msg.author.id, "Casino - Slot Losses") > 100000){
            bot.achievments.addUserAchievment(msg.guild.id, msg.author.id, "Bad at slots", "You've lost a lot at the casino.", ["Casino - Slot Losses"]);
        }
    }
}
gamesList["slots"] = {function: Slots, description: "A slot machine game."};

var CoinFlip = function (msg) {
    var guess = msg.content.split(" ")[0];
    if(guess !== "h" && guess !== "t"){
        msg.reply("Please enter h or t. For heads and tails");
        return;
    }
    var bet = msg.content.split(" ")[1];
    if (!verifyBet(msg, bet)) {
        msg.reply("You do not have enough points to bet that much.");
        return;
    }

    var coin = getRandomInt(1);
    bot.logger.debug(coin);
    if (coin == 0) {
        //heads
        if(guess == "h"){
            msg.reply("You guessed heads and it was heads. You won " + bet + " points.");
            bot.points.addPointsForUser(msg.guild.id, msg.author.id, bet, "Casino - Won at Coinflip");
        } else {
            msg.reply("You guessed tails and it was heads. You lost " + bet + " points.");
            bot.points.addPointsForUser(msg.guild.id, msg.author.id, -bet, "Casino - Lost at Coinflip");
        }
    } else {
        //tails
        if(guess == "t"){
            msg.reply("You guessed tails and it was tails. You won " + bet + " points.");
            bot.points.addPointsForUser(msg.guild.id, msg.author.id, bet, "Casino - Won at Coinflip");
        } else {
            msg.reply("You guessed heads and it was tails. You lost " + bet + " points.");
            bot.points.addPointsForUser(msg.guild.id, msg.author.id, -bet, "Casino - Lost at Coinflip");
        }
    }
}
gamesList["coinflip"] = {function: CoinFlip, description: "Flips a coin."};

var gamesListHelp = function (msg) {
    var embed = new MessageEmbed()
    .setTitle("Casino Games")
    .setDescription("These are the games that are currently available in the casino.");
    
    for(var game in gamesList){
        embed.addField(game, gamesList[game].description);
    }

    msg.reply({embeds: [embed]})
}

var casinoHandler = function (msg) {
    var command = msg.content.split(" ")[0];
    msg.content = msg.content.substr(command.length + 1, msg.content.length);
    if (command === "" || command === "help" || command === "gamelist") {
        gamesListHelp(msg);
        return;
    };
    var fn = gamesList[command]?.function;
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
    bot.registerCommand("casino", casinoHandler);
}

exports.requires = ["./cogs/serverpoints.js", "./cogs/achievments.js"];
exports.ready = ready;
exports.setup = setup;