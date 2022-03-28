# RyuZU-Bot 2
A discord bot built on modularity with cogs.

## Configuration
In order to run, RyuZU needs a settings.json file to be created inside of its directory. Your file should look something like this...
```json
{
  "token": "",
  "owners": [],
  "startupExtensions": [],
  "commandString": "",
  "gameMessage": "",
  "issuesPage": ""
}
```
You may wish to have more in this file depending on what cogs you are using.

### Key Definitions
* *token*: Your Discord App Bot User Token. This is **required** for the bot to run.
* *startupExtensions*: An array of what cogs you want to use. The strings should match the **exact** way they are in the project.
* *owners*: An array of usernames for the server owner(s). These names should include the discriminator (the # with numbers after it)
* *commandString*: A string that contains what character the bot uses for commands. This is **required** for the bot to do anything.
* *gameMessage*: The message to show alongside the version number in the bot's status
* *issuesPage*: A link to the relavent page to report issues to (provided for self-hosted, modified versions).
* *stackdriverName*: The logName for logs sent to Google Stackdriver
* *database*: An object containing the database information, as it should be passed to typeorm.
	* *type*: The type of the database, suggested "postgres"
	* *host*: Thostname or IP address of the database
	* *port*: The port of the database
	* *username*: The username to access the database
	* *password*: The password to access the database
	* *database*: The name of the database
* *devMode*: Optional. Signifies that the bot is in development mode.

Even if you don't plan on using the *owners* or any extensions, you should include an empty array for those values.

## Creating a cog
You can creat a cog either locally as a loose file in the repo, or make an NPM package (untested, but intended). A cog should extend the Cog class.

Cogs should register commands through bot.registerCommand. The first argument is the command name, the second is the function to run when the command is called, implementing CogFunction.

Extra functionality may be given in the public interface of your cog. Other cogs may be accessed through the getCog function.

### Notes
* bot will contain all of the important systems such as bot.client, which is the Discord.js client the bot runs.
* exports.requires should be in the same format as used for loading cogs
* every cog gets a local reference to the bot, so you can access it from anywhere in your cog, this is implemented in the Cog constructor.

## Using a cog
There are 3 ways to use a cog:
1. Add the cog to your config.json's startupExtensions line
2. Add the cog to the coreCogs list in the base file (Only should be done for official development)
3. Require another cog from within your cog.

Each of these ways are specified in the same format, each is an array containing strings used the load the module with require. (should work for npm packages and local files, with a path.) Of course, if you load a local file, make sure to specify it as a path to that file.