import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type { WebhookEditMessageOptions } from "discord.js";
import { escapeMarkdown } from "discord.js";
import ms from "ms";
import CustomClient from "../CustomClient";
import { setPermanentTimeout } from "../setPermanentTimeout";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Bann a user from a guild.
 * @param client - The client
 * @param userId - The id of the user to bann
 * @param guildId - The guild to bann the user from
 * @param executorId - The user who executed the action, if any
 * @param reason - The reason for the action
 * @param deleteMessageDays - The number of days to delete
 * @param duration - The duration of the ban
 */
export const bann: ActionMethod<"bann", WebhookEditMessageOptions> = async (
	client,
	userId,
	guildId,
	executorId,
	reason,
	deleteMessageDays,
	duration
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
	const member = await guild.members.fetch(userId).catch(() => null);
	if (userId === guild.ownerId)
		return {
			content: "Non puoi bannare il proprietario del server!",
			ephemeral: true,
		};
	const rawPosition = member?.roles.highest.rawPosition;

	if (
		member &&
		executor &&
		isNotOwner &&
		executor.roles.highest.rawPosition <= rawPosition!
	)
		return {
			content:
				"Non puoi bannare un membro con un ruolo superiore o uguale al tuo!",
			ephemeral: true,
		};
	const durationMs = duration !== undefined ? ms(duration) : undefined;
	const noDuration = durationMs === undefined;

	if (!noDuration && durationMs < 60_000)
		return {
			content: "La durata deve essere maggiore di 1 minuto!",
			ephemeral: true,
		};
	const { me } = guild.members;

	if (!me!.permissions.has(PermissionFlagsBits.BanMembers))
		return {
			content:
				"Non ho i permessi per bannare membri!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
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
	if (member && me!.roles.highest.rawPosition <= rawPosition!)
		return {
			content:
				"Non posso bannare un membro con un ruolo maggiore o uguale al mio!",
			ephemeral: true,
		};
	const timestamp = noDuration
		? undefined
		: Math.round((Date.now() + durationMs) / 1000);

	return Promise.all([
		member?.user ?? client.users.fetch(userId),
		guild.members.ban(userId, {
			reason: `${
				executor ? `Bannato da ${executor.user.tag} (${executorId!})` : ""
			}${reason == null ? "" : `${executor ? ": " : ""}${reason}`}`,
			deleteMessageDays: Number(deleteMessageDays) || undefined,
		}),
		noDuration
			? undefined
			: setPermanentTimeout("unbann", durationMs, guildId, userId),
	])
		.then(
			([banned]): WebhookEditMessageOptions => ({
				content: `<@${userId}> (${escapeMarkdown(
					banned.tag
				)} - ${userId}) è stato bannato dal server${
					noDuration ? "" : ` fino a <t:${timestamp!}:F> (<t:${timestamp!}:R>)`
				}!${
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
								label: "Revoca bann",
								style: ButtonStyle.Danger,
								custom_id: createActionId(
									"unbann",
									userId,
									guildId,
									executorId
								),
							},
						],
					},
				],
			})
		)
		.catch((error: Error) => {
			CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
				ephemeral: true,
			};
		});
};
