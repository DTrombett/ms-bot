import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type { WebhookEditMessageOptions } from "discord.js";
import { Util } from "discord.js";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Kick a user from a guild.
 * @param client - The client
 * @param userId - The id of the user to kick
 * @param guildId - The guild to kick the user from
 * @param executorId - The user who executed the action, if any
 * @param reason - The reason for the action
 */
export const kick: ActionMethod<"kick", WebhookEditMessageOptions> = async (
	client,
	userId,
	guildId,
	executorId,
	reason
) => {
	const guild = client.guilds.cache.get(guildId)!;
	const executor =
		executorId === undefined
			? null
			: await guild.members.fetch(executorId).catch(() => null);
	const isNotOwner = executorId !== guild.ownerId;

	if (
		isNotOwner &&
		executor?.permissions.has(PermissionFlagsBits.KickMembers) !== true
	)
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: **Espelli membri**",
			ephemeral: true,
		};
	const member = await guild.members.fetch(userId).catch(() => null);

	if (!member)
		return {
			content: "L'utente non fa parte del server!",
			ephemeral: true,
		};
	if (userId === guild.ownerId)
		return {
			content: "Non puoi espellere il proprietario del server!",
			ephemeral: true,
		};
	const { rawPosition } = member.roles.highest;

	if (
		executor &&
		isNotOwner &&
		executor.roles.highest.rawPosition <= rawPosition
	)
		return {
			content:
				"Non puoi espellere un membro con un ruolo superiore o uguale al tuo!",
			ephemeral: true,
		};
	const { me } = guild;

	if (!me!.permissions.has(PermissionFlagsBits.KickMembers))
		return {
			content:
				"Non ho i permessi per espellere membri!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url: `https://discord.com/api/oauth2/authorize?client_id=${
								client.application.id
							}&permissions=${
								PermissionFlagsBits.KickMembers | me!.permissions.bitfield
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guildId}`,
							label: "Autorizza",
							style: ButtonStyle.Link,
						},
					],
				},
			],
		};
	if (me!.roles.highest.rawPosition <= rawPosition)
		return {
			content:
				"Non posso espellere un membro con un ruolo maggiore o uguale al mio!",
			ephemeral: true,
		};

	return guild.members
		.kick(
			userId,
			`${executor ? `Espulso da ${executor.user.tag} (${executorId!})` : ""}${
				reason == null ? "" : `${executor ? ": " : ""}${reason}`
			}`
		)
		.then(
			(): WebhookEditMessageOptions => ({
				content: `<@!${userId}> (${Util.escapeMarkdown(
					member.user.tag
				)} - ${userId}) è stato espulso dal server!${
					reason == null
						? ""
						: `\n\nMotivo: ${
								reason.length > 1000 ? `${reason.slice(0, 1000)}...` : reason
						  }`
				}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "Banna",
								style: ButtonStyle.Danger,
								custom_id: createActionId("bann", userId, guildId, executorId),
							},
						],
					},
				],
			})
		)
		.catch((error: Error) => {
			void CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
				ephemeral: true,
			};
		});
};
