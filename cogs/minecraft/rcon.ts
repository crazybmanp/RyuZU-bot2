import { Rcon } from 'rcon-client';

export type RconResult = { success: boolean, warning?: string, error?: string };

export async function whitelistPlayer(rconHost: string, rconPort: number, rconPassword: string, username: string): Promise<RconResult> {
	const rconClient = await Rcon.connect({
		host: rconHost,
		port: rconPort,
		password: rconPassword,
		timeout: 5000,
	});

	const response = await rconClient.send(`whitelist add ${username}`);
	await rconClient.end();
	if (response.match(/Added/)) {
		return {
			success: true,
		}
	} else if (response.match(/already whitelisted/)) {
		return {
			success: true,
			warning: 'Player was already whitelisted',
		}
	} else {
		return {
			success: false,
			error: `Failed to whitelist player: ${response}`,
		}
	}
}

export async function unwhitelistPlayer(rconHost: string, rconPort: number, rconPassword: string, username: string, kick: boolean = false): Promise<RconResult> {
	const rconClient = await Rcon.connect({
		host: rconHost,
		port: rconPort,
		password: rconPassword,
		timeout: 5000,
	});

	const response = await rconClient.send(`whitelist remove ${username}`);
	if (kick) {
		await rconClient.send(`kick ${username} You have been unwhitelisted`);
	}
	await rconClient.end();
	if (response.match(/Removed/)) {
		return {
			success: true
		};
	} else if (response.match(/That player does not exist/)) {
		return {
			success: true,
			warning: 'Player was not whitelisted',
		};
	} else {
		return {
			success: false,
			error: `Failed to unwhitelist player: ${response}`,
		};
	}
}

export async function getWhitelistedUsernames(rconHost: string, rconPort: number, rconPassword: string): Promise<string[]> {
	const rconClient = await Rcon.connect({
		host: rconHost,
		port: rconPort,
		password: rconPassword,
		timeout: 5000,
	});

	const response = await rconClient.send('whitelist list');
	await rconClient.end();
	if (!response.match(/There (is\/)?are/)) {
		throw Error(`Failed to get whitelisted usernames: ${response}`);
	}

	if (response.match(/There are no/)) {
		return [];
	}

	const usernames = response.split(':')[1].trim().split(',').map((username) => username.trim());
	return usernames;
}