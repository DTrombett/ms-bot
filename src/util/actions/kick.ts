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
 * Kick a user from a guild.
 * @param client - The client
 * @param user - The id of the user to kick
 * @param guild - The guild to kick the user from
 * @param executor - The user who executed the action, if any
 * @param reason - The reason for the action
 */
export const kick: ActionMethod<"kick"> = async (
	client,
	user,
	guild,
	executor,
	reason
) => {
	user = client.users.resolveId(user);
	guild = client.guilds.resolve(guild)!;
	executor =
		executor instanceof GuildMember || executor == null
			? executor
			: await guild.members.fetch(executor).catch(() => undefined);
	if (executor && !executor.permissions.has(PermissionFlagsBits.KickMembers))
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: Espelli membri",
		};
	const member = await guild.members.fetch(user).catch(() => null);

	if (!member)
		return {
			content: "L'utente non fa parte del server!",
		};
	if (member.id === guild.ownerId)
		return {
			content: "Non puoi espellere il proprietario del server!",
		};
	const { rawPosition } = member.roles.highest;

	if (
		executor &&
		executor.user.id !== guild.ownerId &&
		executor.roles.highest.rawPosition <= rawPosition
	)
		return {
			content:
				"Non puoi espellere un membro con un ruolo superiore o uguale al tuo!",
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
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guild.id}`,
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
		};

	return guild.members
		.kick(
			user,
			`${
				executor ? `Espulso da ${executor.user.tag} (${executor.user.id})` : ""
			}${reason == null ? "" : `${executor ? ": " : ""}${reason}`}`
		)
		.then(
			(): WebhookEditMessageOptions => ({
				content: `<@!${member.id}> (${Util.escapeMarkdown(member.user.tag)} - ${
					member.id
				}) è stato espulso dal server!${
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
								custom_id: createActionButton(
									"bann",
									member.id,
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
