import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
	DiscordAPIError,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";

/**
 * Delete an emoji.
 * @param client - The client
 * @param emojiIdentifier - The id of the emoji or its name
 * @param guildId - The id of the guild
 * @param executorId - The id of the user who executes the action
 * @param reason - The reason for deleting the emoji
 */
export const deleteEmoji: ActionMethod<
	"deleteEmoji",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (client, emojiIdentifier, guildId, executorId, reason) => {
	const guild = client.guilds.cache.get(guildId)!;
	const executor =
		executorId === undefined
			? null
			: await guild.members.fetch(executorId).catch(() => null);
	const isNotOwner = executorId !== guild.ownerId;

	if (
		isNotOwner &&
		executor?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers) !==
			true
	)
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: **Gestire emoji e adesivi**",
			ephemeral: true,
		};
	const emoji = guild.emojis.cache.find(
		(e) =>
			e.id === emojiIdentifier ||
			e.name === emojiIdentifier ||
			e.toString() === emojiIdentifier
	);

	if (!emoji)
		return {
			content: "Emoji non trovata! Specifica il nome completo o l'id.",
			ephemeral: true,
		};
	if (emoji.managed ?? false)
		return {
			content:
				"Questa emoji è gestita da un'integrazione e non può essere eliminata. Rimuovi l'integrazione per cancellarla.",
			ephemeral: true,
		};
	const { me } = guild;

	if (!me!.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers))
		return {
			content:
				"Non ho i permessi per rimuovere emoji!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url: `https://discord.com/api/oauth2/authorize?client_id=${
								client.application.id
							}&permissions=${
								PermissionFlagsBits.ManageEmojisAndStickers |
								me!.permissions.bitfield
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guildId}`,
							label: "Autorizza",
							style: ButtonStyle.Link,
						},
					],
				},
			],
		};
	return emoji
		.delete(reason)
		.then(() => ({
			content: `Emoji \`:${emoji.name ?? "emoji"}:\` rimossa con successo!`,
		}))
		.catch((error: DiscordAPIError | Error) => {
			void CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
				ephemeral: true,
			};
		});
};
