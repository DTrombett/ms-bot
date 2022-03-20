import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

/**
 * Pong!
 * @param client - The client
 */
export const ping: ActionMethod<
	"ping",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = (client) =>
	Promise.resolve({
		content: `Latency is **${client.ws.ping}ms**.`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: createActionId("ping"),
						label: "Pong!",
						style: ButtonStyle.Success,
						emoji: { name: "🏓" },
					},
				],
			},
		],
	});
