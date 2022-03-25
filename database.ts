import typeorm from "typeorm";
import { Bot } from "./lib/Bot";
import { Cog } from "./lib/Cog";
import { default as Model } from "./Model";

class databaseCog extends Cog{
	requires: string[] = [];

	async setup() {
		const datasource = new typeorm.DataSource({
			synchronize: true,
			entities: [Model],
			...this.bot.config.database
		});
		this.bot.logger.info("Connecting to database...");
		await datasource.initialize()
			.then(() => {
				this.bot.logger.info("Data Source has been initialized!")
			})
			.catch((err) => {
				this.bot.logger.error("Error during Data Source initialization", err)
			})
		await datasource.synchronize();
		this.bot.datasource = datasource;
	}
}

export default (bot: Bot) => {return new databaseCog(bot);}