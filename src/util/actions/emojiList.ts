import { TimestampStyles } from "@discordjs/builders";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { Colors } from "discord.js";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Get a list of emojis in a server.
 * @param client - The client
 * @param guildId - The id of the server
 * @param page - The page number
 */
export const emojiList: ActionMethod<"emojiList"> = (
	client,
	guildId,
	page = 0
) => {
	const guild = client.guilds.cache.get(guildId)!;
	const end = page * 25 + 25;
	const emojis = [...guild.emojis.cache.values()].slice(page * 25, end);

	return Promise.resolve<Awaited<ReturnType<typeof emojiList>>>({
		embeds: [
			{
				title: "Emoji del server",
				fields: emojis.map((emoji) => {
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
				footer: {
					text: `Pagina ${page + 1}/${Math.ceil(guild.emojis.cache.size / 25)}`,
				},
				description: emojis.length === 0 ? "Nessun emoji trovata!" : undefined,
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
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: createActionId("emojiList", guildId, page - 1),
						style: ButtonStyle.Primary,
						disabled: page === 0,
						emoji: {
							name: "⬅",
						},
						label: "Precedente",
					},
					{
						type: ComponentType.Button,
						custom_id: createActionId("emojiList", guildId, page + 1),
						style: ButtonStyle.Primary,
						disabled: end >= guild.emojis.cache.size,
						emoji: {
							name: "➡",
						},
						label: "Successivo",
					},
				],
			},
		],
	});
};
