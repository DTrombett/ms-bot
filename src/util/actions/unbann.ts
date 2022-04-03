import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type { DiscordAPIError, WebhookEditMessageOptions } from "discord.js";
import { Util } from "discord.js";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Unbann a user from a guild.
 * @param client - The client
 * @param userId - The id of the user to unbann
 * @param guildId - The guild to unbann the user from
 * @param executorId - The user who executed the action, if any
 * @param reason - The reason for the action
 */
export const unbann: ActionMethod<"unbann", WebhookEditMessageOptions> = async (
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
		executor?.permissions.has(PermissionFlagsBits.BanMembers) !== true
	)
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: **Bannare i membri**",
			ephemeral: true,
		};
	const { me } = guild;

	if (!me!.permissions.has(PermissionFlagsBits.BanMembers))
		return {
			content:
				"Non ho i permessi per sbannare membri!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url: `https://discord.com/api/oauth2/authorize?client_id=${
								client.application.id
							}&permissions=${
								PermissionFlagsBits.BanMembers | me!.permissions.bitfield
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guildId}`,
							label: "Autorizza",
							style: ButtonStyle.Link,
						},
					],
				},
			],
		};
	if (
		!guild.bans.cache.has(userId) &&
		!(await guild.bans.fetch().then((bans) => bans.has(userId)))
	)
		return {
			content: "Questo utente non è bannato!",
			ephemeral: true,
		};
	return Promise.all([
		client.users.fetch(userId),
		guild.members.unban(
			userId,
			`${executor ? `Sbannato da ${executor.user.tag} (${executorId!})` : ""}${
				reason == null ? "" : `${executor ? ": " : ""}${reason}`
			}`
		),
	])
		.then(
			([unbanned]): WebhookEditMessageOptions => ({
				content: `Ho revocato il bann per <@${userId}> (${Util.escapeMarkdown(
					unbanned.tag
				)} - ${userId})!${
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
								label: "Banna di nuovo",
								style: ButtonStyle.Danger,
								custom_id: createActionId("bann", userId, guildId, executorId),
							},
						],
					},
				],
			})
		)
		.catch((error: DiscordAPIError | Error) => {
			void CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
				ephemeral: true,
			};
		});
};
