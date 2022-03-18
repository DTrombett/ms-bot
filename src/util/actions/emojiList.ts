import { TimestampStyles } from "@discordjs/builders";
import { Colors } from "discord.js";
import type { ActionMethod } from "../types";

/**
 * Get a list of emojis in a server.
 * @param client - The client
 * @param guildId - The id of the server
 */
export const emojiList: ActionMethod<"emojiList"> = (client, guildId) => {
	const guild = client.guilds.cache.get(guildId)!;

	return Promise.resolve<Awaited<ReturnType<typeof emojiList>>>({
		embeds: [
			{
				title: "Emoji del server",
				fields: guild.emojis.cache.first(25).map((emoji) => {
					const createdTimestamp = Math.round(emoji.createdTimestamp / 1000);

					return {
						name: emoji.name ?? "emoji",
						value: `<:${emoji.identifier}> [${emoji.name ?? "emoji"}](<${
							emoji.url
						}>) - <t:${createdTimestamp}:${
							TimestampStyles.LongDateTime
						}> (<t:${createdTimestamp}:${TimestampStyles.RelativeTime}>)`,
					};
				}),
				author: {
					name: guild.name,
					icon_url:
						guild.iconURL({
							extension: "png",
							forceStatic: false,
							size: 4096,
						}) ?? undefined,
				},
				color: Colors.Blurple,
				timestamp: new Date().toISOString(),
			},
		],
	});
};
