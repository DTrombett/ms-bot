import {
	APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { Command } from "../util";

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

const makePrediction = (
	ephemeral = false,
): APIInteractionResponseCallbackData => ({
	content:
		Math.random() < 0.95
			? replies[Math.floor(Math.random() * replies.length)]
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
	flags: ephemeral ? MessageFlags.Ephemeral : undefined,
});

export const predict = new Command({
	data: [
		{
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
		},
	],
	run(_, { reply }) {
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: makePrediction(),
		});
	},
	component(_, { reply }) {
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: makePrediction(true),
		});
	},
});
