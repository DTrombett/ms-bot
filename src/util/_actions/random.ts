import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import randomNumber from "../randomNumber";
import type { ActionMethod } from "../types";
import { createActionId } from "../actions";

/**
 * Generate a random number between two numbers!
 * @param _client - The client
 * @param min - The minimum number
 * @param max - The maximum number
 */
export const random: ActionMethod<
	"randomNumber",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_client, min, max) => {
	if (typeof min !== typeof max)
		return {
			content:
				"Devi specificare sia il minimo che il massimo o nessuno dei due per un numero decimale tra 0 e 1",
			ephemeral: true,
		};
	const minNumber = Number(min);
	const maxNumber = Number(max);

	return {
		content: `🎲 ${randomNumber(
			(isNaN(minNumber) ? undefined : minNumber)!,
			(isNaN(maxNumber) ? undefined : maxNumber)!
		)}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Genera un altro!",
						style: ButtonStyle.Primary,
						emoji: { name: "🎲" },
						custom_id: createActionId("randomNumber", min, max),
					},
				],
			},
		],
	};
};
