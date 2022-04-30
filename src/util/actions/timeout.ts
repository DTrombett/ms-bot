import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type { WebhookEditMessageOptions } from "discord.js";
import { Util } from "discord.js";
import ms from "ms";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Timeout a member in a guild.
 * @param client - The client
 * @param userId - The id of the user to timeout
 * @param guildId - The guild to timeout the user from
 * @param timeoutStr - The amount of time to timeout the user for,
 * @param executorId - The user who executed the action, if any
 * @param reason - The reason for the action
 */
export const timeout: ActionMethod<
	"timeout",
	WebhookEditMessageOptions
> = async (client, userId, guildId, timeoutStr, executorId, reason) => {
	const guild = client.guilds.cache.get(guildId)!;
	const executor =
		executorId === undefined
			? null
			: await guild.members.fetch(executorId).catch(() => null);
	const isNotOwner = executorId !== guild.ownerId;

	if (
		isNotOwner &&
		executor?.permissions.has(PermissionFlagsBits.ModerateMembers) !== true
	)
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: **Metti i membri in Time out**",
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
			content: "Non puoi applicare il Time out al proprietario del server!",
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
				"Non puoi applicare il Time out ad un membro con un ruolo superiore o uguale al tuo!",
			ephemeral: true,
		};
	const { me } = guild;

	if (!me!.permissions.has(PermissionFlagsBits.ModerateMembers))
		return {
			content:
				"Non ho i permessi per mettere i membri in Time out!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							url: `https://discord.com/api/oauth2/authorize?client_id=${
								client.application.id
							}&permissions=${
								PermissionFlagsBits.ModerateMembers | me!.permissions.bitfield
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
				"Non posso applicare il Time out ad un membro con un ruolo maggiore o uguale al mio!",
			ephemeral: true,
		};
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	const duration = timeoutStr ? ms(timeoutStr) : null;
	const oldTimeout = member.communicationDisabledUntilTimestamp;
	const timestamp =
		duration == null ? null : Math.round((Date.now() + duration) / 1000);

	if (timeoutStr == null && !member.isCommunicationDisabled())
		return {
			content: "L'utente non è in Time out!",
			ephemeral: true,
		};
	if (
		(duration as string | null | undefined) === undefined ||
		(duration != null && (isNaN(duration) || duration <= 1_000))
	)
		return {
			content:
				"La durata del Time out non è valida! Specifica una durata valida maggiore di 1 secondo.",
			ephemeral: true,
		};
	return member
		.timeout(
			duration,
			`${
				executor
					? `${duration == null ? "Annullato" : "Applicato"} da ${
							executor.user.tag
					  } (${executorId!})`
					: ""
			}${reason == null ? "" : `${executor ? ": " : ""}${reason}`}`
		)
		.then(
			(): WebhookEditMessageOptions =>
				duration == null
					? {
							content: `Ho annullato il Time out a <@${userId}> (${Util.escapeMarkdown(
								member.user.tag
							)} - ${userId})!`,
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											label: "Applica nuovamente",
											style: ButtonStyle.Danger,
											custom_id: createActionId(
												"timeout",
												userId,
												guildId,
												`${oldTimeout! - Date.now()}ms`,
												executorId
											),
										},
									],
								},
							],
					  }
					: {
							content: `<@${userId}> (${Util.escapeMarkdown(
								member.user.tag
							)} - ${userId}) è stato messo in timeout fino a <t:${timestamp!}:F> (<t:${timestamp!}:R>)!${
								reason == null
									? ""
									: `\n\nMotivo: ${
											reason.length > 1000
												? `${reason.slice(0, 1000)}...`
												: reason
									  }`
							}`,
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											label: "Annulla",
											style: ButtonStyle.Danger,
											custom_id: createActionId(
												"timeout",
												userId,
												guildId,
												null,
												executorId
											),
										},
									],
								},
							],
					  }
		)
		.catch((error: Error) => {
			void CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
				ephemeral: true,
			};
		});
};
