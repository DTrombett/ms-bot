import { TimestampStyles } from "@discordjs/builders";
import {
	ButtonStyle,
	ComponentType,
	GuildPremiumTier,
	OAuth2Scopes,
	PermissionFlagsBits,
} from "discord-api-types/v10";
import type {
	DiscordAPIError,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	MessageOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import { escapeBold, GuildEmoji } from "discord.js";
import { Buffer } from "node:buffer";
import CustomClient from "../CustomClient";
import type { ActionMethod } from "../types";
import { createActionId } from "../actions";

const emojiLimit: Record<GuildPremiumTier, number> = {
	[GuildPremiumTier.None]: 50,
	[GuildPremiumTier.Tier1]: 100,
	[GuildPremiumTier.Tier2]: 150,
	[GuildPremiumTier.Tier3]: 250,
};

/**
 * Create an emoji.
 * @param client - The client
 * @param guildId - The id of the guild
 * @param attachment - The attachment of the emoji
 * @param name - The name of the emoji
 * @param executorId - The id of the executor
 * @param reason - The reason of creating the emoji
 * @param roles - The roles that can use the emoji
 */
export const createEmoji: ActionMethod<
	"createEmoji",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (client, guildId, attachment, name, executorId, reason, ...roles) => {
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
	if (name.length < 2 || name.length > 32)
		return {
			content: "Il nome dell'emoji deve essere compreso tra 2 e 32 caratteri!",
			ephemeral: true,
		};
	if (!/^[a-zA-Z0-9-_]+$/.test(name))
		return {
			content:
				"Il nome dell'emoji deve essere composto solo da caratteri alfanumerici e trattini bassi!",
			ephemeral: true,
		};
	if (attachment instanceof Buffer && attachment.byteLength >= 256 * 1024)
		return {
			content: "L'immagine deve essere inferiore di 256KB!",
			ephemeral: true,
		};
	if (guild.emojis.cache.size >= emojiLimit[guild.premiumTier])
		return {
			content: `Limite emoji raggiunto (${emojiLimit[guild.premiumTier]})!`,
			ephemeral: true,
		};
	const { me } = guild.members;

	if (!me!.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers))
		return {
			content:
				"Non ho i permessi per aggiungere emoji!\nPer favore, autorizzami cliccando il pulsante qui sotto.",
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
	const emoji = await guild.emojis
		.create({
			attachment,
			name,
			reason: `${
				executor ? `Aggiunta da ${executor.user.tag} (${executorId!})` : ""
			}${reason == null ? "" : `${executor ? ": " : ""}${reason}`}`,
			roles,
		})
		.catch((error: DiscordAPIError | Error) => {
			CustomClient.printToStderr(error);
			return {
				content: `Si è verificato un errore: \`${error.message}\``,
				ephemeral: true,
			};
		});

	if (!(emoji instanceof GuildEmoji)) return emoji;
	const createdTimestamp = Math.round(emoji.createdTimestamp / 1000);
	const components: MessageOptions["components"] = [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					custom_id: createActionId("emojiList", guildId),
					label: "Lista emoji",
					style: ButtonStyle.Primary,
					emoji: {
						animated: emoji.animated ?? false,
						name: emoji.name ?? undefined,
						id: emoji.id,
					},
				},
			],
		},
	];
	const allowedRoles = emoji.roles;

	return {
		content: `${emoji.toString()} Emoji [${emoji.name!}](${
			emoji.url
		}) aggiunta con successo! (${emoji.id})\n\nAnimata: **${
			emoji.animated ?? false ? "Sì" : "No"
		}**\nCreata <t:${createdTimestamp}:${
			TimestampStyles.LongDateTime
		}> (<t:${createdTimestamp}:${TimestampStyles.RelativeTime}>)${
			allowedRoles.cache.size > 0
				? `\nRuoli consentiti: ${allowedRoles.cache
						.map((r) => `<@&${r.id}> (**${escapeBold(r.name)}**)`)
						.join(", ")}`
				: ""
		}`,
		components,
	};
};
