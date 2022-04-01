import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import { Util } from "discord.js";
import type { ActionMethod } from "../types";

/**
 * Get the icon of a guild.
 * @param client - The client
 * @param guildId - The id of the guild
 */
export const icon: ActionMethod<
	"icon",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (client, guildId) => {
	const guild = client.guilds.cache.get(guildId)!;
	const iconURL = guild.iconURL({
		extension: "png",
		forceStatic: false,
		size: 4096,
	});

	return iconURL == null
		? {
				content: "Questo server non ha un'icona!",
				ephemeral: true,
		  }
		: {
				content: `Icona di **[${Util.escapeBold(guild.name)}](${iconURL} )**:`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								url: iconURL,
								style: ButtonStyle.Link,
								label: "Apri l'originale",
							},
						],
					},
				],
		  };
};
