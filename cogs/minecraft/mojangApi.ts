import fetch from 'node-fetch';

export async function getUuidFromUsername(username: string): Promise<string> {
	const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
	if (response.status !== 200) {
		throw Error('Failed to get UUID');
	}

	const json = await response.json() as { id: string, name: string };
	return json.id;
}

export async function getUsernameFromUuid(uuid: string): Promise<string> {
	const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
	if (response.status !== 200) {
		throw Error('Failed to get username');
	}

	const json = await response.json() as { id: string, name: string };
	return json.name;
}