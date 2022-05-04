const { MessageEmbed } = require("discord.js");

var bot = {};
var server_db = {};

var newUser = function (db, userId) {
    if(!userId){
        bot.logger.error("Achievments - No userId provided!");
        return;
    }
    bot.logger.info("Achievments - New user " + userId);
    const user = {
        userId: userId,
        stats: {},
        achievments: []
    }
    db.get('users').push(user).write();
    return user;
}

var getUser = function (guildId, userId) {
    db = server_db[guildId];
    var user = db.get('users').find({
        userId: userId
    }).value();

    if(!user){
        user = newUser(db, userId);
    }
    return user;
}

var getUserStats = function (guildId, userId) {
    var user = getUser(guildId, userId);
    return JSON.parse(JSON.stringify(user.stats));
}

var getUserAchievments = function (guildId, userId) {
    var user = getUser(guildId, userId);
    var achievements = JSON.parse(JSON.stringify(user.achievments));
    for(var chiev of achievements){
        if(chiev.linkedStats){
            chiev.value = {};
            for(var stat of chiev.linkedStats){
                var s = getUserStat(guildId, userId, stat);
                chiev.value[stat] = {};
                if(s){
                    chiev.value[stat].name = stat;
                    chiev.value[stat].value = s;
                }else{
                    chiev.value[stat].name = stat;
                    chiev.value[stat].value = "Stat not found";
                }
            }
        }
    }
    achievements.linkedStats = undefined;
    return achievements;
}

var setUserStat = function (guildId, userId, statName, value) {
    var db = server_db[guildId];
    var userStats = getUser(guildId, userId).stats;
    userStats[statName] = value;
    db.write();
}

var incrementUserStat = function (guildId, userId, statName, value) {
    var stat = getUserStat(guildId, userId, statName);
    if(!stat){
        stat = 0;
    }
    stat += value;
    setUserStat(guildId, userId, statName, stat);
}

var addUserAchievment = function (guildId, userId, achievName, description, linkedStats) {
    var db = server_db[guildId];
    var userAchievments = getUser(guildId, userId).achievments;
    if(userAchievments.find(a => a.name === achievName)){
        return;
    }
    var achievment = {
        name: achievName,
        description: description,
        date: Date.now(),
        linkedStats: linkedStats
    }
    userAchievments.push(achievment)
    db.write();
}

var removeUserAchievment = function (guildId, userId, achievName) {
    var db = server_db[guildId];
    var userAchievments = getUser(guildId, userId).achievments;
    var achievment = userAchievments.find(a => a.name === achievName);
    if(!achievment){
        return;
    }
    user.achievments.splice(user.achievments.indexOf(achievment), 1);
    db.write();
}
    

var getUserStat = function (guildId, userId, statName) {
    var stats = getUserStats(guildId, userId);
    return stats[statName];
}

var getUserAchievment = function (guildId, userId, achievName) {
    var achievements = getUserAchievments(guildId, userId);
    return achievements.find(a => a.name === achievName);
}

var getUserAchievmentsCommand = async function (msg) {
    var referenceUser = msg?.mentions?.members?.first() ?? await msg.guild.members.fetch(msg.author.id);
    var userId = referenceUser.id;
    if(userId===msg.author.id || bot.isMod(msg.channel, msg.author)) {
        var achievements = getUserAchievments(msg.guild.id, userId);
        if(!achievements){
            msg.reply("This user has no achievments.");
            return;
        }
        var embed = new MessageEmbed();
        embed.setTitle(referenceUser.displayName + "'s Achievements");
        embed.setAuthor("Achievements");
        embed.setColor(0x00FF00);
        embed.setDescription("This user has " + achievements.length + " achievments.");
        embed.setTimestamp();

        for(var item of achievements){
            var fname = item.name;
            if(!fname || fname === ""){
                fname = "No description";
            }
            var fval = item.description;
            for(var stat in item.value){
                stat = item.value[stat];
                fval += "\n" + stat.name + ": " + stat.value;
            }
            if(!fval || fval === ""){
                fval = "No description";
            }
            embed.addField(fname, fval);
        }

        msg.reply({embeds: [embed]});
    }
}

var ready = async function () {
    bot.logger.info("Achievements - Mounting DBs");
    server_db = await bot.db.getAllCogDBs("achievements");
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
    bot.registerCommand("achievements", getUserAchievmentsCommand);
    bot.achievments = {
        getUser: getUser,
        getUserStats: getUserStats,
        getUserAchievments: getUserAchievments,
        setUserStat: setUserStat,
        incrementUserStat: incrementUserStat,
        addUserAchievment: addUserAchievment,
        removeUserAchievment: removeUserAchievment,
        getUserStat: getUserStat,
        getUserAchievment: getUserAchievment
    };
}

exports.requires = ["./database.js"];
exports.setup = setup;
exports.ready = ready;