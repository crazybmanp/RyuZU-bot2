var bot = {};

var printLong = function (channel, items, safety = 60) {
    var messageList = [];
    var curMessage = "";
    for (var i = 0; i < items.length; i++) {
        if (curMessage.length + items[i].length > 2000) {
            messageList.push(curMessage);
            curMessage = "";
        }
        curMessage += items[i];
    }
    messageList.push(curMessage);

    var messages = messageList.length;
    var hitSafety = false;
    if(messageList.length > safety) {
        messages = safety;
        hitSafety = true;
        bot.logger.warn("Hit safety limit of " + safety + " messages, sending " + messageList.length + " messages.");
    }

    for (var i = 0; i < messages; i++) {
        channel.send(messageList[i]);
    }

    if(hitSafety) {
        channel.send("This message has been truncated due to excessive length. Sorry.");
    }
}

var setup = function (b) {
    bot = b;
    bot.printLong = printLong;
}

exports.requires = [];
exports.setup = setup;