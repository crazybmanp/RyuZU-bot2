import fs from 'fs';

export type DatabaseConfig = {
	type: string,
	host: string,
	port: string,
	username: string,
	password: string,
	database: string,
	schema?: string
}

export type WebConfig = {
	enable: {
		homepage: boolean;
		health: boolean;
		command: boolean;
	}
	webroot: string,
	port: number,
	ssl?: {
		sslKey?: string,
		sslCert?: string,
		sslKeyLocation?: string,
		sslCertLocation?: string
		port: number
	}
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
	webConfig?: WebConfig
	CommandServerRegistration?:
	{
		CommandServerList: [string]
	}
}

const defaultConfig: Partial<Config> = {
	startupExtensions: [],
	owners: [],
	gameMessage: 'RyuZu',
	description: 'A modular bot for Discord.',
	issuesPage: 'https://github.com/crazybmanp/RyuZU-bot2/issues',
	devMode: false
};

type types = 'string' | 'number' | 'boolean' | 'undefined';

type envMapElComp =
	{
		name: string,
		type: types
	}

type envMapEl<T> = T extends object ? configEnvMap<T> : envMapElComp

type configEnvMap<t> = Partial<{
	[key in keyof t]: envMapEl<t[key]>
}>

const configEnvMap: configEnvMap<Config> = {
	token: { name: 'DISCORD_TOKEN', type: 'string' },
	applicationId: { name: 'DISCORD_APPLICATION_ID', type: 'string' },
	database: {
		type: { name: 'DB_TYPE', type: 'string' },
		host: { name: 'DB_HOST', type: 'string' },
		port: { name: 'DB_PORT', type: 'string' },
		username: { name: 'DB_USERNAME', type: 'string' },
		password: { name: 'DB_PASSWORD', type: 'string' },
		database: { name: 'DB_DATABASE', type: 'string' },
		schema: { name: 'DB_SCHEMA', type: 'string' }
	},
	webConfig: {
		webroot: { name: 'RYUZU_WEBROOT', type: 'string' },
		port: { name: 'RYUZU_WEBPORT', type: 'number' },
		ssl: {
			sslKey: { name: 'RYUZU_SSL_KEY', type: 'string' },
			sslCert: { name: 'RYUZU_SSL_CERT', type: 'string' },
			sslKeyLocation: { name: 'RYUZU_SSL_KEY_LOCATION', type: 'string' },
			sslCertLocation: { name: 'RYUZU_SSL_CERT_LOCATION', type: 'string' },
			port: { name: 'RYUZU_SSL_PORT', type: 'number'}
		}
	},
	stackdriverName: { name: 'STACKDRIVER_NAME', type: 'string' }
}

function isDatabaseConfig(arg: unknown): arg is DatabaseConfig {
	if (typeof arg === 'object' && arg !== null) {
		const dbConfig = arg as DatabaseConfig;
		return typeof dbConfig.host === 'string'
			&& typeof dbConfig.port === 'number'
			&& typeof dbConfig.username === 'string'
			&& typeof dbConfig.password === 'string'
			&& typeof dbConfig.database === 'string'
			&& (
				typeof dbConfig.schema === 'string'
				|| typeof dbConfig.schema === 'undefined'
			);
	}
	return false;
}

function isWebConfig(arg: unknown): arg is WebConfig {
	if (typeof arg === 'object' && arg !== null) {
		const webConfig = arg as WebConfig;
		if (typeof webConfig.webroot === 'string'
			&& typeof webConfig.port === 'number') {
			if (webConfig.ssl) {
				if (typeof webConfig.ssl.port !== 'number') { return false; }
				if(typeof webConfig.ssl.sslKey === 'string' || typeof webConfig.ssl.sslKeyLocation === 'string') {
					if(typeof webConfig.ssl.sslCert === 'string' || typeof webConfig.ssl.sslCertLocation === 'string') {
						return true;
					}
				}
				return false;
			}
			return true;
		}
	}
	return false
}

function isConfig(arg: unknown): arg is Config {
	if (typeof arg === 'object' && arg !== null) {
		const config = arg as Config;

		if (!config.token || typeof config.token !== 'string') { return false; }
		if (!config.applicationId || typeof config.applicationId !== 'string') { return false; }

		if (config.startupExtensions && Array.isArray(config.startupExtensions)) {
			for (const extension of config.startupExtensions) {
				if (typeof extension !== 'string') { return false; }
			}
		} else {
			return false;
		}

		if (config.owners && Array.isArray(config.owners)) {
			for (const owner of config.owners) {
				if (typeof owner !== 'string') { return false; }
			}
		} else {
			return false;
		}

		if (!config.gameMessage || typeof config.gameMessage !== 'string') { return false; }
		if (!config.description || typeof config.description !== 'string') { return false; }
		if (!config.issuesPage || typeof config.issuesPage !== 'string') { return false; }
		if (typeof config.devMode !== 'boolean') { return false; }

		if (config.CommandServerRegistration) {
			if (config.CommandServerRegistration.CommandServerList) {
				if (Array.isArray(config.CommandServerRegistration.CommandServerList)) {
					for (const server of config.CommandServerRegistration.CommandServerList) {
						if (typeof server !== 'string') { return false; }
					}
				} else {
					return false;
				}
			}
		}

		if (config.stackdriverName && typeof config.stackdriverName !== 'string') { return false; }

		if (config.database && !isDatabaseConfig(config.database)) {
			return false;
		}

		if (config.webConfig && !isWebConfig(config.webConfig)) {
			return false;
		}
		return true;
	}
	return false;
}

function isSingleMapEl(mapEl: unknown): mapEl is envMapElComp {
	const el = mapEl as envMapElComp;
	if (el.name && typeof el.name === 'string' && el.type && typeof el.type === 'string' && ['string', 'number', 'boolean', 'undefined'].includes(el.type)) {
		return true;
	} else {
		return false;
	}
}

function getEnvProperties(): Partial<Config> | undefined {
	const env = process.env;

	return parseEnvConfigPart<Config>(env, configEnvMap);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEnvConfigPart<t>(env: any, obj: any): Partial<t> | undefined {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
	const config = {} as any;

	for (const [key, mapEl] of Object.entries(obj)) {
		if (typeof mapEl === 'object' && mapEl !== null && isSingleMapEl(mapEl)) {
			const { name, type } = mapEl;
			let v: unknown = undefined;

			switch (type) {
				case 'string':
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					v = String(env[name]);
					break;
				case 'number':
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					v = Number(env[name]);
					if (isNaN(v as number)) {
						v = undefined;
					}
					break;
				case 'boolean':
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					v = Boolean(env[name]);
					break;
				case 'undefined':
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					v = env[name];
					break;
			}

			if (v) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
				config[key] = env[name];
			}
		} else if (typeof mapEl === 'object' && mapEl !== null) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const subConfig = parseEnvConfigPart<typeof mapEl>(env, obj[key]);

			if (subConfig) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
				config[key] = subConfig;
			}
		}
	}

	if (JSON.stringify(config) === '{}') {
		return undefined;
	}
	return config as Partial<t>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any
function overlayConfig(config: any, file: any) {
	for (const [key, value] of Object.entries(file)) {
		if (Array.isArray(value)) {
			Object.assign(config, { [key]: value });
		} else if (typeof value === 'object' && value !== null) {
			if (value == undefined) {
				continue;
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (config[key] == undefined) {
				const tmp = {};
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				overlayConfig(tmp, value);
				if(JSON.stringify(tmp) !== '{}') {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					Object.assign(config, { [key]: tmp })
				}
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				overlayConfig(config[key], value);
			}
		} else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			if (config === undefined) {
				config = {};
			}
			Object.assign(config, { [key]: value });
		}
	}
}

export function getConfig(): Config {
	const config = defaultConfig as Config;

	const file = (JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Partial<Config>);
	overlayConfig(config, file);

	const env = getEnvProperties();
	if (env) { overlayConfig(config, env); }

	if (!isConfig(config)) {
		throw new Error('Config file is not valid');
	}

	return config;
}
