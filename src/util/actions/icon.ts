import type { ActionMethod } from "../types";

/**
 * Get the icon of a guild.
 * @param client - The client
 * @param guildId - The id of the guild
 */
export const icon: ActionMethod<"icon"> = (client, guildId) => {
	const guild = client.guilds.cache.get(guildId)!;
	const iconURL = guild.iconURL({
		extension: "png",
		forceStatic: false,
		size: 4096,
	});

	return Promise.resolve(
		iconURL == null
			? {
					content: "Questo server non ha un'icona!",
					ephemeral: true,
			  }
			: {
					content: `[Icona di ${guild.name}](${iconURL} ):`,
			  }
	);
};
