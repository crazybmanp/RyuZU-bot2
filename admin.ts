import discord, { Message } from 'discord.js';
import { Bot } from './app';

let bot: Bot;

let isOwner = function (author) {
    let fullname: string = author.username + '#' + author.discriminator;
    for (let i = 0; i < bot.config.owners.length; i++) {
        let owner: string = bot.config.owners[i];
        if (owner === fullname) {
            return true;
        }
    }
    return false;
};

let isMod = function (channel, author) {
    let perms = channel.permissionsFor(author);
    return perms.has('MANAGE_MESSAGES');
};

let say = function (msg) {
    msg.delete();
    msg.channel.send(msg.content)
        .catch(function (err) {
            bot.logger.error('Error sending a message', { err });
            msg.channel.send('I can\'t say that for some reason')
                .catch(function (err2) {
                    bot.logger.error('Error sending message saying we had an error sending a message', { err2 });
                });
        });
};

let clean = function (msg: Message) {
    let lim: number = parseInt(msg.content);
    msg.channel.fetchMessages({
        limit: isNaN(lim) ? 100 : lim
    })
        .then(function (messages) {
            messages = messages.filter(function (s) {
                return (s.author.id === bot.client.user.id || s.content.startsWith(bot.config.commandString));
            });
            msg.channel.bulkDelete(messages);
            msg.reply('Deleted ' + messages.size + ' messages.');
        })
        .catch(function (err) {
            bot.logger.error('Error fetching messages', { err });
        });
};

let purge = async function (msg: Message) {
    if (bot.isMod(msg.channel, msg.author)) {
        let lim: number = parseInt(msg.content) + 1;
        if (isNaN(lim)) {
            msg.reply('You need to specify a number of messages to purge.');
            return;
        }
        let messages = await msg.channel.fetchMessages({
            limit: lim
        });
        msg.channel.bulkDelete(messages);
        msg.reply('Deleted ' + messages.size + ' messages.');
    } else {
        msg.reply('You are not allowed to do that');
    }
};

let issue = function (msg) {
    msg.reply('Here is a link to my issues page on my github, please report any issues here: ' + bot.config.issuesPage);
};

let setup = function (b) {
    bot = b;
    bot.isOwner = isOwner;
    bot.isMod = isMod;
    bot.registerCommand('say', say);
    bot.registerCommand('clean', clean);
    bot.registerCommand('clear', clean);
    bot.registerCommand('purge', purge);
    bot.registerCommand('issue', issue);
    bot.registerCommand('issues', issue);
};

exports.requires = [];
exports.setup = setup;