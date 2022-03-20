import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import { Util } from "discord.js";
import type { ActionMethod } from "../types";

/**
 * Get the banner of a user.
 * @param client - The client
 * @param userId - The id of the user
 */
export const banner: ActionMethod<
	"banner",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (client, userId) => {
	const user = await client.users.fetch(userId, { force: true });
	const bannerURL = user.bannerURL({
		extension: "png",
		forceStatic: false,
		size: 4096,
	});

	return bannerURL == null
		? {
				content: "Questo utente non ha un banner!",
				ephemeral: true,
		  }
		: {
				content: `Banner di **[${Util.escapeBold(
					user.username
				)}](${bannerURL} )**:`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								url: bannerURL,
								style: ButtonStyle.Link,
								label: "Apri l'originale",
							},
						],
					},
				],
		  };
};
