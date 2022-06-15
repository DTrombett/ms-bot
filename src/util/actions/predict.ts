import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { ActionMethod } from "../types";
import { createActionId } from "./actions";

const replies = [
	"Sì",
	"Certamente",
	"Palese",
	"Fattuale",
	"Ma che me lo chiedi a fare",

	"No",
	"Impossibile",
	"Non ci credi nemmeno tu",
	"L'importante è crederci",
	"Mi viene da ridere solo a pensarci",

	"Idk",
	"Forse",
	"Opinionabile",
	"Chiedilo a qualcun altro",
	"Non ne ho la più pallida idea",
];

/**
 * Predict something!
 * @param _client - The client
 * @param text - The text to predict
 */
export const predict: ActionMethod<
	"predict",
	InteractionReplyOptions & InteractionUpdateOptions & WebhookEditMessageOptions
> = async (_client, text) => ({
	content:
		Math.random() < 0.95
			? replies[Math.floor(Math.random() * replies.length)]
			: "MA IO CHE CABBO NE POSSO SAPERE!!!",
	components: [
		{
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					label: "Chiedi nuovamente",
					style: ButtonStyle.Primary,
					emoji: { name: "💬" },
					custom_id: createActionId("predict", text),
				},
			],
		},
	],
});
