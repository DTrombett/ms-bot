import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { Util } from "discord.js";
import type { ActionMethod } from "../types";

/**
 * Get the avatar of a user.
 * @param client - The client
 * @param userId - The id of the user
 * @param guildId - The id of the guild
 */
export const avatar: ActionMethod<"avatar"> = async (
	client,
	userId,
	guildId
) => {
	const userOrMember = await (guildId === undefined
		? client.users.fetch(userId)
		: client.guilds.cache
				.get(guildId)!
				.members.fetch(userId)
				.catch(() => client.users.fetch(userId)));
	const avatarURL = userOrMember.displayAvatarURL({
		extension: "png",
		forceStatic: false,
		size: 4096,
	});

	return {
		content: `Avatar di **[${Util.escapeBold(
			"nickname" in userOrMember
				? userOrMember.nickname ?? userOrMember.user.username
				: userOrMember.username
		)}](${avatarURL} )**:`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						url: avatarURL,
						style: ButtonStyle.Link,
						label: "Apri l'originale",
					},
				],
			},
		],
	};
};
