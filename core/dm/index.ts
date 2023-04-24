import { Embed } from '@discordjs/builders';
import { Bot } from '../../lib/Bot';
import { Guild } from '../../model';

export async function sendDm(bot: Bot, cogName: string, guild: Guild, targetUserId: string, message: string, title?: string): Promise<void> {
	const targetUser = await bot.client.users.fetch(targetUserId);
	const dmChannel = await targetUser.createDM();
	const embed = new Embed()
		.setAuthor({ name: `${cogName} @ ${guild.name}` })
		.setDescription(message);
	if (title) embed.setTitle(title);
	await dmChannel.send({ embeds: [embed] });
}