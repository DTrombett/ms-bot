import {
	ButtonStyle,
	ComponentType,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import { Colors } from "discord.js";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Get a list of bann in a server.
 * @param client - The client
 * @param guildId - The id of the server
 * @param page - The page number
 */
export const bannList: ActionMethod<
	"bannList",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (client, guildId, page = "0", executorId) => {
	const guild = client.guilds.cache.get(guildId)!;
	const executor =
		executorId === undefined
			? null
			: await guild.members.fetch(executorId).catch(() => null);
	const isNotOwner = executorId !== guild.ownerId;

	if (
		isNotOwner &&
		executor?.permissions.has(PermissionFlagsBits.BanMembers) !== true
	)
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: **Bannare i membri**",
			ephemeral: true,
		};
	const pageNumber = Number(page);
	const end = pageNumber * 25 + 25;
	const collection = (
		guild.bans.cache.size ? guild.bans.cache : await guild.bans.fetch()
	)
		.clone()
		.reverse();
	const { size } = collection;
	const bans = [...collection.values()].slice(pageNumber * 25, end);

	return {
		embeds: [
			{
				title: "Membri bannati",
				fields: bans.map((bann) => ({
					name: `${bann.user.tag} (${bann.user.id})`,
					value:
						bann.reason != null
							? bann.reason.length > 1024
								? `${bann.reason.slice(0, 1021)}...`
								: bann.reason
							: "Nessuna motivazione",
				})),
				footer: {
					text: `Pagina ${pageNumber + 1}/${Math.ceil(size / 25)}`,
				},
				description: bans.length === 0 ? "Nessun bann trovato!" : undefined,
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
						custom_id: createActionId(
							"bannList",
							guildId,
							`${pageNumber - 1}`,
							executorId,
							"true"
						),
						style: ButtonStyle.Primary,
						disabled: page === "0",
						emoji: {
							name: "⬅",
						},
						label: "Precedente",
					},
					{
						type: ComponentType.Button,
						custom_id: createActionId(
							"bannList",
							guildId,
							`${pageNumber + 1}`,
							executorId,
							"true"
						),
						style: ButtonStyle.Primary,
						disabled: end >= size,
						emoji: {
							name: "➡",
						},
						label: "Successivo",
					},
				],
			},
		],
	};
};
