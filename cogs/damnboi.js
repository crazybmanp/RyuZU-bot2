var _meme_msg = "oh yeah damn damn boi DAMN BOI HE THICC BOI THAT'S A THICC ASS BOI DAMN";
var bot = {};


var memeMe = function (msg) {
    var arr = msg.toString().split(' ');
    _shuffle(arr);
    return arr.join(' ');
}

var damn = function (msg) {
    msg.channel.send(memeMe(_meme_msg));
}

//Shamelessly stolen from stack overflow
function _shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

var constructQuote = function (quote) {
    return quote.id + "(" + quote.category + "): " + quote.quote;
}

var printQuote = function (msg, quote) {
    msg.channel.send(constructQuote(quote));
}

var quotedamn = function (msg) {
    var q;
    if (msg.content.length > 0) {
        num = parseInt(msg.content);
        if (isNaN(num)) {
            msg.reply("You need to give a quote number in order to get a quote");
            return;
        }
        q = bot.giveQuote(msg.guild, num)
        if (typeof q === 'undefined') {
            msg.reply("Quote not found.");
            return;
        }
    } else {
        q = bot.giveQuote(msg.guild)
    }
    q.quote = memeMe(q.quote);
    printQuote(msg, q);
}

var mix = function (msg) {
    msg.channel.send(memeMe(msg.content));
}

var setup = function (b) {
    bot = b;
    bot.memeMe = memeMe;
    bot.registerCommand("damnboi", damn);
    bot.registerCommand("mix", mix);
    bot.registerCommand("damnquote", quotedamn);
    bot.registerCommand("strokeout", quotedamn);
    bot.registerCommand("sromkoot", quotedamn);
    bot.registerCommand("stronkout", quotedamn);
}

exports.requires = [];
exports.setup = setup;