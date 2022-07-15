import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord-api-types/v10";
import type { ReceivedInteraction } from "../util";
import { createCommand, randomNumber } from "../util";

type RandomOptions = {
	min?: number;
	max?: number;
};

const random = async (
	interaction: ReceivedInteraction,
	options: RandomOptions = {},
	ephemeral?: boolean
) => {
	if (typeof options.min !== typeof options.max) {
		await interaction.reply({
			content:
				"Devi specificare sia il minimo che il massimo o nessuno dei due se vuoi un numero decimale tra 0 e 1",
			ephemeral: true,
		});
		return;
	}
	await interaction.reply({
		content: `🎲 ${randomNumber(options.min!, options.max!)}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Genera un altro!",
						style: ButtonStyle.Primary,
						emoji: { name: "🎲" },
						custom_id: `random-${options.min ?? "."}-${options.max ?? "."}`,
					},
				],
			},
		],
		ephemeral,
	});
};

export const command = createCommand({
	data: [
		{
			name: "random",
			description:
				"Genera un numero casuale tra due numeri o, se non specificati, genera un numero decimale tra 0 e 1",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "min",
					description: "Il numero minimo",
					type: ApplicationCommandOptionType.Integer,
					min_value: Number.MIN_SAFE_INTEGER,
					max_value: Number.MAX_SAFE_INTEGER - 1,
				},
				{
					name: "max",
					description: "Il numero massimo",
					type: ApplicationCommandOptionType.Integer,
					min_value: Number.MIN_SAFE_INTEGER + 1,
					max_value: Number.MAX_SAFE_INTEGER,
				},
			],
		},
	],
	async run(interaction) {
		const options: RandomOptions = {};

		for (const option of interaction.options.data)
			if (typeof option.value === "number")
				options[option.name as keyof RandomOptions] = option.value;
		await random(interaction, options);
	},
	async component(interaction) {
		const [, min, max] = interaction.customId.split("-");

		await random(
			interaction,
			{ min: Number(min) || undefined, max: Number(max) || undefined },
			true
		);
	},
});
