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
 * Roll the dice!
 * @param _client - The client
 * @param count - The number of dice to roll
 */
export const dice: ActionMethod<
	"dice",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_client, count = "1") => {
	const diceCount = Number(count);

	if (diceCount > 100)
		return {
			content: `Non puoi lanciare più di 100 dadi!`,
			ephemeral: true,
		};
	const results: number[] = [];
	let result = 0;

	for (let i = 0; i < diceCount; i++) {
		const roll = randomNumber(1, 6);

		result += roll;
		results.push(roll);
	}
	return {
		content: `🎲 **${result}** (${results.join(", ")}) con ${diceCount} dadi!`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: createActionId("dice", count),
						label: "Tira di nuovo!",
						style: ButtonStyle.Success,
						emoji: {
							name: "🎲",
						},
					},
				],
			},
		],
	};
};
