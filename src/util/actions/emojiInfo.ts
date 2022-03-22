import { TimestampStyles } from "@discordjs/builders";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	MessageOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import { Util } from "discord.js";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Get information about an emoji.
 * @param client - The client
 * @param emojiIdentifier - The id of the emoji or its name
 * @param guildId - The id of the guild
 */
export const emojiInfo: ActionMethod<
	"emojiInfo",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (client, emojiIdentifier, guildId) => {
	const emoji =
		client.emojis.cache.get(emojiIdentifier) ??
		(guildId !== undefined
			? client.guilds.cache
					.get(guildId)
					?.emojis.cache.find(
						(e) =>
							e.id === emojiIdentifier ||
							e.name === emojiIdentifier ||
							e.toString() === emojiIdentifier
					)
			: undefined);

	if (!emoji)
		return {
			content: "Emoji non trovata! Specifica il nome completo o l'id.",
			ephemeral: true,
		};
	const createdTimestamp = Math.round(emoji.createdTimestamp / 1000);
	const components: MessageOptions["components"] = [];
	const { roles } = emoji;
	const author =
		emoji.author ?? (await emoji.fetchAuthor().catch(() => undefined));

	if (guildId !== undefined)
		components.push({
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
		});
	return {
		content: `${emoji.toString()} [${emoji.name ?? "emoji"}](${emoji.url}) (${
			emoji.id
		})\n\nAnimata: **${
			emoji.animated ?? false ? "Sì" : "No"
		}**\nCreata <t:${createdTimestamp}:${
			TimestampStyles.LongDateTime
		}> (<t:${createdTimestamp}:${
			TimestampStyles.RelativeTime
		}>))\nGestita da un integrazione: **${
			emoji.managed ?? false ? "Sì" : "No"
		}**${
			author
				? `\nAutore: <@!${author.id}> (**${Util.escapeBold(author.tag)}**)`
				: ""
		}${
			roles.cache.size > 0
				? `\nRuoli consentiti: ${roles.cache
						.map((r) => `<@&${r.id}> (**${Util.escapeBold(r.name)}**)`)
						.join(", ")}`
				: ""
		}`,
		components,
	};
};
