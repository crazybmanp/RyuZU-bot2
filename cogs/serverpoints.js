const { MessageEmbed } = require("discord.js");

var bot = {};
var server_db = {};

var setPointsForUserCommand = async function (msg) {
    if(bot.isMod(msg.channel, msg.author)) {
        var referenceUser = msg?.mentions?.members?.first() ?? await msg.guild.members.fetch(msg.author.id);
        var userId = referenceUser.id;
        if(msg?.mentions?.members?.first()){
            var points = parseInt(msg.content.split(" ")[1]);
        } else {
            var points = parseInt(msg.content.split(" ")[0]);
        }
        if(isNaN(points)||!isFinite(points)){
            msg.reply("Points must be a number!");
            return;
        }
        bot.logger.info("Setting " + points + " points for " + msg.author.id);
        setPointsForUser(server_db[msg.guild.id], userId, points);
        msg.reply(referenceUser.displayName + " now has " + points + " points.");
    }
}

var addPointsForUserCommand = async function (msg) {
    if(bot.isMod(msg.channel, msg.author)) {
        var referenceUser = msg?.mentions?.members?.first() ?? await msg.guild.members.fetch(msg.author.id);
        var userId = referenceUser.id;
        if(msg?.mentions?.members?.first()){
            var points = parseInt(msg.content.split(" ")[1]);
        } else {
            var points = parseInt(msg.content.split(" ")[0]);
        }        
        if(isNaN(points)||!isFinite(points)){
            msg.reply("Points must be a number!");
            return;
        }
        bot.logger.info("Adding " + points + " points to " + msg.author.id);
        var endingBalance = addPointsForUser(server_db[msg.guild.id], userId, points, "Moderator "+msg.author.username+" added "+points+" points", msg.author.id);
        if(endingBalance){
            msg.reply(referenceUser.displayName + " now has " + endingBalance + " points.");
        }
    }
}

var getPointsForUserCommand = async function (msg) {
    var referenceUser = msg?.mentions?.members?.first() ?? await msg.guild.members.fetch(msg.author.id);
    var userId = referenceUser.id;
    if((msg.author.id===userId) || (bot.isMod(msg.channel, msg.author))) {
        var points = getPointsForUser(server_db[msg.guild.id], userId);    
        if((msg.author.id===userId)){
            msg.reply("You have " + points + " points.");
        }else{
            msg.reply(referenceUser.displayName + " has " + points + " points.");
        }
    }
}

var givePointsForUserCommand = async function (msg) {
    var referenceUser = msg?.mentions?.members?.first();
    if(!referenceUser){
        msg.reply("You must mention a user!");
    }
    var userId = referenceUser.id;

    var points = parseInt(msg.content.split(" ")[1]);      
    if(isNaN(points)||!isFinite(points)){
        msg.reply("Points must be a number!");
        return;
    }else if(points<0){
        msg.reply("Points must be positive!");
    }

    var userBalance = getPointsForUser(server_db[msg.guild.id], msg.author.id);
    if(userBalance<points){
        msg.reply("You don't have enough points!");
        return;
    }

    var endingBalance1 = addPointsForUser(server_db[msg.guild.id], msg.author.id, -points, msg.author.username + " gave " + points + " points to " + referenceUser.displayName, msg.author.id);

    var endingBalance2 = addPointsForUser(server_db[msg.guild.id], userId, points, msg.author.username + " gave " + points + " points to " + referenceUser.displayName, msg.author.id);

    if(endingBalance1&&endingBalance2){
        msg.reply("Your transfer is complete! \n You have " + endingBalance1 + " points\n" + referenceUser.displayName + " now has " + endingBalance2 + " points");
    } else {
        if((!endingBalance1)&&(!endingBalance2)){
            msg.reply("Something went wrong, nothing has changed.");
        } else if(!endingBalance1) {
            rollbackTransaction(server_db[msg.guild.id],userId);
            msg.reply("Something went wrong, you have been refunded");
        } else if(!endingBalance2) {
            rollbackTransaction(server_db[msg.guild.id],msg.author.id);
            msg.reply("Something went wrong, you have been refunded");
        }
    }
}

var getUserHistoryCommand = async function (msg) {
    var referenceUser = msg?.mentions?.members?.first() ?? await msg.guild.members.fetch(msg.author.id);
    var userId = referenceUser.id;
    if(userId===msg.author.id || bot.isMod(msg.channel, msg.author)) {
        var history = getUserTransaction(server_db[msg.guild.id], userId);
        var points = getPointsForUser(server_db[msg.guild.id], userId);
        if(!history){
            msg.reply("This user has no history.");
            return;
        }
        var embed = new MessageEmbed();
        embed.setTitle(referenceUser.displayName + "'s Transaction History");
        embed.setAuthor("ServerPoints");
        embed.setColor(0x00AE86);
        embed.setDescription("Balance: " + points + " points");
        embed.setFooter("Showing up to 10 latest transactions | Valid at");
        embed.setTimestamp();

        for(var item of history.slice(Math.max(history.lenght -10, 0))){
            var fname = item.description;
            if(!fname || fname === ""){
                fname = "No description";
            }
            var fval = item.value + "";
            if(!fval || fval === ""){
                fval = "No description";
            }
            embed.addField(fname, fval);
        }

        msg.reply({embeds: [embed]});
    }
}

var getPointsForUserExternal = function (guildId, userid){
    return getPointsForUser(server_db[guildId], userid);
}

var addPointsForUserExternal = function (guildId, userid, points, description, userReference = undefined) {
    return addPointsForUser(server_db[guildId], userid, points, description, userReference);
}

var newUser = function (db, userId) {
    if(!userId){
        bot.logger.error("ServerPoints - No userId provided!");
        return;
    }
    bot.logger.info("ServerPoints - New user " + userId);
    const user = {
        userId: userId,
        points: 500,
        history: [{value: 500, date: new Date(), description: "Initial balance", referenceUser: undefined}]
    }
    db.get('users').push(user).write();
    return user;
}

var getUser = function (db, userId) {
    var user = db.get('users').find({
        userId: userId
    }).value();

    if(!user){
        user = newUser(db, userId);
    }
    return user;
}

var getPointsForUser = function (db, userId) {
    return getUser(db, userId).points;
}

var setPointsForUser = function (db, userId, points) {
    var user = getUser(db, userId);
    user.points = points
    db.write();  
}

var getUserTransaction = function (db, userId) {
    return getUser(db, userId).history;
}

var rollbackTransaction = function (db, userId) {
    var user = getUser(db, userId);
    //var transaction = user.history[user.history.length-1];
    var transaction = user.history.pop();
    bot.logger.debug("Rolling back transaction:" + JSON.stringify(transaction));
    var newPoints = user.points - transaction.value;
    setPointsForUser(db, userId, newPoints);
    db.write();
}

var addTransactionToUser = function(db, userId, points, description, referenceUser = undefined) {
    var user = getUser(db, userId);
    const transaction = {
        value: points,
        date: new Date(),
        description: description,
        referenceUser: referenceUser
    }
    user.history.push(transaction);
    db.write();
}

var addPointsForUser = function (db, userId, points, description, referenceUser = undefined, skipTransaction = false) {
    var points = -(-points);
    var userPoints = getPointsForUser(db, userId);
    if(points<0){
        if(userPoints<Math.abs(points)){
            return false;
        }
    }
    var newValue = userPoints + points;
    if(newValue<0){
        return false
    } else if(isNaN(newValue)){
        bot.logger.error("ServerPoints - Error adding points for user " + userId + ": " + newValue);
        return false;
    } else if(!isFinite(newValue)){
        bot.logger.error("ServerPoints - User "+userId+" has an infinite amount of points!");
        newValue = Number.MAX_VALUE;
    }
    setPointsForUser(db, userId, newValue);
    addTransactionToUser(db, userId, points, description, referenceUser);
    return newValue;
}

var ready = async function () {
    bot.logger.info("ServerPoints - Mounting DBs");
    server_db = await bot.db.getAllCogDBs("serverpoints");
    for (var dbname in server_db) {
        db = server_db[dbname];
        if (!db.has('users').value()) {
            bot.logger.info("Setting up new server");
            db.defaults({
                users: [],
            }).write();
        }
    }
}

var setup = function (b) {
    bot = b;
    bot.registerCommand("points-set", setPointsForUserCommand);
    bot.registerCommand("points-add", addPointsForUserCommand);
    bot.registerCommand("points-get", getPointsForUserCommand);
    bot.registerCommand("points-give", givePointsForUserCommand);
    bot.registerCommand("points-history", getUserHistoryCommand);
    bot.points = {
        getPointsForUser: getPointsForUserExternal, 
        addPointsForUser: addPointsForUserExternal
    };
}

exports.requires = ["./database.js"];
exports.setup = setup;
exports.ready = ready;