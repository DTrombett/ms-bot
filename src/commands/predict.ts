import {
	APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { Command, type ChatInputReplies, type ComponentReplies } from "../util";

export class Predict extends Command {
	static override chatInputData = {
		name: "predict",
		description: "Hai un dubbio? Chiedilo a me!",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "question",
				description: "La domanda da porre",
				type: ApplicationCommandOptionType.String,
				required: true,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "predict";
	static replies = [
		"Sì",
		"Palese",
		"Fattuale",
		"Ovviamente",
		"Certamente",
		"Assolutamente",
		"Ma che me lo chiedi a fare",

		"No",
		"Negativo",
		"Impossibile",
		"Assolutamente ||no||",
		"Non ci credi nemmeno tu",
		"L'importante è crederci",
		"Mi viene da ridere solo a pensarci",

		"Idk",
		"Forse",
		"Opinionabile",
		"Chiedilo a qualcun altro",
		"La risposta è dentro di te",
		"Non ne ho la più pallida idea",
		"Quando ti troverai una ragazza... forse",
	];
	override chatInput({ reply }: ChatInputReplies) {
		reply(this.makePrediction());
	}
	override component({ reply }: ComponentReplies) {
		reply(this.makePrediction(MessageFlags.Ephemeral));
	}
	makePrediction(flags?: MessageFlags): APIInteractionResponseCallbackData {
		return {
			content:
				Math.random() < 0.95
					? Predict.replies[Math.floor(Math.random() * Predict.replies.length)]
					: "MA IO CHE CABBO NE SO?!?!?!",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Chiedi nuovamente",
							style: ButtonStyle.Primary,
							emoji: { name: "💬" },
							custom_id: "predict",
						},
					],
				},
			],
			flags,
		};
	}
}
