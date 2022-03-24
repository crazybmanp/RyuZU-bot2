var bot = {};

var printLong = function (channel, items) {
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

    for (var i = 0; i < messageList.length; i++) {
        channel.send(messageList[i]);
    }
}

var setup = function (b) {
    bot = b;
    bot.printLong = printLong;
}

exports.requires = [];
exports.setup = setup;