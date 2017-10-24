# RyuZU-Bot 2
A discord bot built on modularity with cogs.

## Configuration
In order to run, RyuZU needs a settings.json file to be created inside of its directory. Your file should look something like this...
```json
{
  "token": "",
  "owners": [],
  "startupExtensions": [],
  "commandString": ""
}
```
You may wish to have more in this file depending on what cogs you are using.

### Key Definitions
* *token*: Your Discord App Bot User Token. This is **required** for the bot to run.
* *startupExtensions*: An array of what cogs you want to use. The strings should match the **exact** way they are in the project.
* *owners*: An array of usernames for the server owner(s). These names should include the discriminator (the # with numbers after it)
* *commandString*: A string that contains what character the bot uses for commands. This is **required** for the bot to do anything.
* *devMode*: Optional. Signifies that the bot is in development mode.

Even if you don't plan on using the *owners* or any extensions, you should include an empty array for those values.

## Creating a cog
You can creat a cog either locally as a loose file in the repo, or make an NPM package (untested, but intended). The standard cog skeleton looks like this:

```javascript
var bot = {};

var setup = function(b)
{
    bot = b;
    bot.registerCommand("ping", function(msg){msg.reply('Pong!')});
}

exports.requires = [];
exports.setup = setup;
```
(note that creating annonymous functions is not required or recommended)
You may also attatch functions onto the bot system for other cogs to use and require.

Look at the admin.js cog for a good example of how to use the system.

### Notes
* bot will contain all of the important systems such as bot.client, which is the Discord.js client the bot runs.
* overwriting other cogs methods defined on bot is not recommended, but is possible.
* exports.requires should be in the same format as used for loading cogs
* setup takes in the bot as a parameter, and you should store that as a local variable so that your functions can reference it, if need be (commands will also get access to the message passed to the handler)

## Using a cog
There are 3 ways to use a cog:
1. Add the cog to your config.json's startupExtensions line
2. Add the cog to the coreCogs list in the base file (Only should be done for official development)
3. Require another cog from within your cog.

Each of these ways are specified in the same format, each is an array containing strings used the load the module with require. (should work for npm packages and local files, with a path.) Of course, if you load a local file, make sure to specify it as a path to that file.