export type DatabaseConfig = {
	type: string,
	host: string,
	port: string,
	username: string,
	password: string,
	database: string,
	schema?: string
}

export type Config = {
	token: string,
	applicationId: string,
	startupExtensions: string[],
	owners: string[],
	gameMessage: string,
	description: string,
	issuesPage: string,
	devMode: boolean,
	database: DatabaseConfig,
	stackdriverName: string,
	CommandServerRegistration:
	{
		CommandServerList: [string]
	}
}