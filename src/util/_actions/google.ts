import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { ActionMethod } from "../types";

/**
 * Search something on Google!
 * @param _client - The client
 * @param query - The query
 */
export const google: ActionMethod<
	"google",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_client, query) => {
	const url = `https://google.com/search?q=${encodeURIComponent(query)}`;

	return {
		content: url,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Apri nel browser!",
						style: ButtonStyle.Link,
						emoji: { name: "🔍" },
						url,
					},
				],
			},
		],
	};
};
