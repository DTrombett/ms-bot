import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type { Guild, WebhookEditMessageOptions } from "discord.js";
import { GuildMember, Util } from "discord.js";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";
import { createActionButton } from "./actions";

/**
 * Bann a user from a guild.
 * @param client - The client
 * @param user - The id of the user to bann
 * @param guild - The guild to bann the user from
 * @param executor - The user who executed the action, if any
 * @param reason - The reason for the action
 * @param deleteMessageDays - The number of days to delete
 */
export const bann: ActionMethod<"bann"> = async (
	client,
	user,
	guild,
	executor,
	reason,
	deleteMessageDays
) => {
	user = client.users.resolveId(user);
	guild = client.guilds.resolve(guild)!;
	executor =
		executor instanceof GuildMember || executor == null
			? executor
			: await guild.members.fetch(executor).catch(() => undefined);
	if (executor && !executor.permissions.has(PermissionFlagsBits.BanMembers))
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: Bannare i membri",
		};
	const member = await guild.members.fetch(user).catch(() => null);
	if (member?.id === guild.ownerId)
		return {
			content: "Non puoi bannare il proprietario del server!",
		};
	const rawPosition = member?.roles.highest.rawPosition;

	if (
		member &&
		executor &&
		executor.user.id !== guild.ownerId &&
		executor.roles.highest.rawPosition <= rawPosition!
	)
		return {
			content:
				"Non puoi bannare un membro con un ruolo superiore o uguale al tuo!",
		};
	const { me } = guild;

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
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guild.id}`,
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
		};

	return Promise.all([
		member?.user ?? client.users.fetch(user),
		guild.members.ban(user, {
			reason: `${
				executor ? `Bannato da ${executor.user.tag} (${executor.user.id})` : ""
			}${reason == null ? "" : `${executor ? ": " : ""}${reason}`}`,
			deleteMessageDays,
		}),
	])
		.then(
			([banned]): WebhookEditMessageOptions => ({
				content: `<@!${banned.id}> (${Util.escapeMarkdown(banned.tag)} - ${
					banned.id
				}) è stato bannato dal server!${
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
								custom_id: createActionButton(
									"unbann",
									banned.id,
									(guild as Guild).id,
									(executor as GuildMember | undefined)?.id
								),
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
			};
		});
};
