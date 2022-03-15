import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import { User, Util } from "discord.js";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";

/**
 * Unbann a user from a guild.
 * @param client - The client
 * @param id - The id of the user to unban
 * @param guild - The guild to unban the user from
 * @param executor - The user who executed the action, if any
 * @param reason - The reason for the action
 */
export const unbann: ActionMethod<"unbann"> = async (
	client,
	id,
	guild,
	executor,
	reason
) => {
	if (executor && !executor.permissions.has(PermissionFlagsBits.BanMembers))
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: Bannare i membri",
		};
	const me = guild.me ?? (await guild.members.fetch(client.user.id));

	if (!me.permissions.has(PermissionFlagsBits.BanMembers))
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
								PermissionFlagsBits.BanMembers | me.permissions.bitfield
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guild.id}`,
							label: "Autorizza",
							style: ButtonStyle.Link,
						},
					],
				},
			],
		};
	const user = await guild.members
		.unban(
			id,
			`${
				executor ? `Sbannato da ${executor.user.tag} (${executor.user.id})` : ""
			}${reason == null ? "" : `: ${reason}`}`
		)
		.catch((error: Error) => {
			void CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
			};
		});

	return user instanceof User
		? {
				content: `<@!${user.id}> (${Util.escapeMarkdown(user.tag)} - ${
					user.id
				}) è stato sbannato dal server!${
					reason == null
						? ""
						: `\n\nMotivo: ${
								reason.length > 1000 ? `${reason.slice(0, 1000)}...` : reason
						  }`
				}`,
		  }
		: user;
};
