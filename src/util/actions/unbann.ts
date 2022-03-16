import {
	ButtonStyle,
	ComponentType,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type { DiscordAPIError, Snowflake } from "discord.js";
import { GuildMember, Util } from "discord.js";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";

/**
 * Unbann a user from a guild.
 * @param client - The client
 * @param user - The id of the user to unban
 * @param guild - The guild to unban the user from
 * @param executor - The user who executed the action, if any
 * @param reason - The reason for the action
 */
export const unbann: ActionMethod<"unbann"> = async (
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
	if (executor && !executor.permissions.has(PermissionFlagsBits.BanMembers))
		return {
			content:
				"Non hai abbastanza permessi per usare questo comando!\nPermessi richiesti: Bannare i membri",
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
							}&scope=${OAuth2Scopes.Bot}&guild_id=${guild.id}`,
							label: "Autorizza",
							style: ButtonStyle.Link,
						},
					],
				},
			],
		};
	if (
		!guild.bans.cache.has(user) &&
		!(await guild.bans.fetch().then((bans) => bans.has(user as Snowflake)))
	)
		return {
			content: "Questo utente non è bannato!",
		};
	return Promise.all([
		client.users.fetch(user),
		guild.members.unban(
			user,
			`${
				executor ? `Sbannato da ${executor.user.tag} (${executor.user.id})` : ""
			}${reason == null ? "" : `: ${reason}`}`
		),
	])
		.then(([banned]) => ({
			content: `Ho revocato il bann per <@!${banned.id}> (${Util.escapeMarkdown(
				banned.tag
			)} - ${banned.id})!${
				reason == null
					? ""
					: `\n\nMotivo: ${
							reason.length > 1000 ? `${reason.slice(0, 1000)}...` : reason
					  }`
			}`,
		}))
		.catch((error: DiscordAPIError | Error) => {
			void CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
			};
		});
};
