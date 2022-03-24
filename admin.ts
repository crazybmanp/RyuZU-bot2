var bot = {};

var isOwner = function (author) {
    var fullname = author.username + "#" + author.discriminator;
    for (var i = 0; i < bot.config.owners.length; i++) {
        var owner = bot.config.owners[i]
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
    msg.delete();
    msg.channel.send(msg.content)
        .catch(function (err) {
            bot.logger.error('Error sending a message', { err });
            msg.channel.send("I can't say that for some reason")
                .catch(function (err) {
                    bot.logger.error('Error sending message saying we had an error sending a message', { err });
                })
        });
}

var clean = function (msg) {
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
        })
        .catch(function(err) {
            bot.logger.error("Error fetching messages", {err});
        });
}

var purge = async function (msg) {
    if (bot.isMod(msg.channel, msg.author)) {
        lim = parseInt(msg.content) + 1;
        if (isNaN(lim)) {
            msg.reply("You need to specify a number of messages to purge.");
            return;
        }
        var messages = await msg.channel.fetchMessages({
            limit: lim
        })
        msg.channel.bulkDelete(messages);
        d = msg.reply("Deleted " + messages.size + " messages.");
    } else {
        msg.reply("You are not allowed to do that");
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