import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import type { ReceivedInteraction } from "../util";
import { createCommand } from "../util";

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

const predict = async (interaction: ReceivedInteraction, ephemeral?: boolean) => {
	await interaction.reply({
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
						custom_id: "predict",
					},
				],
			},
		],
		ephemeral,
	});
};

export const predictCommand = createCommand({
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
	async run(interaction) {
		await predict(interaction);
	},
	async component(interaction) {
		await predict(interaction, true);
	},
});
