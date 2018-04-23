var bot = {};

var isOwner = function (author) {
    var fullname = author.username + "#" + author.discriminator;
    for (var i = 0; i < bot.config.owners.length; i++) {
        var owner = bot.config.owners[i]
        console.log(owner + " : " + fullname)
        if (owner == fullname) {
            return true;
        }
    }
    return false;
}

var isMod = function (channel, author) {
    var perms = channel.permissionsFor(author);
    return perms.has("MANAGE_MESSAGES");
}

var say = function (msg) {
    msg.channel.startTyping();
    msg.delete();
    msg.channel.send(msg.content)
        .catch(function (err) {
            msg.channel.send("I can't say that for some reason")
                .catch(function () {
                    console.log("something fucked up")
                })
        });
    msg.channel.stopTyping();
}

var clean = function (msg) {
    msg.channel.startTyping();
    if (bot.isMod(msg.channel, msg.author)) {
        lim = parseInt(msg.content);
        msg.channel.fetchMessages({
                limit: isNaN(lim) ? 100 : lim
            })
            .then(function (messages) {
                var messages = messages.filter(function (s) {
                    return (s.author.id === bot.client.user.id || s.content.startsWith(bot.config.commandString))
                })
                msg.channel.bulkDelete(messages);
                d = msg.reply("Deleted " + messages.size + " messages.");
                msg.channel.stopTyping();
            })
            .catch(console.error);
    } else {
        msg.reply("You are not allowed to do that");
        msg.channel.stopTyping();
    }
}

var purge = function (msg) {
    msg.channel.startTyping();
    if (bot.isMod(msg.channel, msg.author)) {
        lim = parseInt(msg.content) + 1;
        if (isNaN(lim)) {
            msg.reply("You need to specify a number of messages to purge.");
            msg.channel.stopTyping();
            return;
        }
        msg.channel.fetchMessages({
                limit: lim
            })
            .then(function (messages) {
                msg.channel.bulkDelete(messages);
                d = msg.reply("Deleted " + messages.size + " messages.");
                msg.channel.stopTyping();
            })
            .catch(console.error);
    } else {
        msg.reply("You are not allowed to do that");
        msg.channel.stopTyping();
    }
}

var issue = function (msg) {
    msg.reply("Here is a link to my issues page on my github, please report any issues here: " + bot.config.issuesPage)
}

var setup = function (b) {
    bot = b;
    bot.isOwner = isOwner;
    bot.isMod = isMod;
    bot.registerCommand("say", say);
    bot.registerCommand("clean", clean);
    bot.registerCommand("clear", clean);
    bot.registerCommand("purge", purge);
    bot.registerCommand("issue", issue);
    bot.registerCommand("issues", issue);
}

exports.requires = [];
exports.setup = setup;