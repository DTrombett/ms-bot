import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import type { ReceivedInteraction } from "../util";
import { createCommand, randomNumber } from "../util";

const dice = async (
	interaction: ReceivedInteraction,
	count: number,
	ephemeral?: boolean,
) => {
	if (count < 1 || count > 100) {
		await interaction.reply({
			content: "Il numero dei dadi deve essere compreso tra 1 e 100!",
			ephemeral: true,
		});
		return;
	}
	const results: number[] = [];
	let result = 0;

	for (let i = 0; i < count; i++) {
		const roll = randomNumber(1, 6);

		result += roll;
		results.push(roll);
	}
	await interaction.reply({
		content: `🎲 **${result}** (${results.join(", ")}) con ${count} dadi!`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						custom_id: `dice-${count}`,
						label: "Tira di nuovo!",
						style: ButtonStyle.Success,
						emoji: {
							name: "🎲",
						},
					},
				],
			},
		],
		ephemeral,
	});
};

export const diceCommand = createCommand({
	data: [
		{
			name: "dice",
			description: "Tira il dado!",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "count",
					description: "Il numero di dadi da tirare (default: 1)",
					type: ApplicationCommandOptionType.Integer,
					min_value: 1,
					max_value: 100,
				},
			],
		},
	],
	async run(interaction) {
		const count = interaction.options.data[0]?.value ?? 1;

		if (typeof count !== "number") {
			await interaction.reply({
				content: "Numero di dadi non valido!",
				ephemeral: true,
			});
			return;
		}
		await dice(interaction, count);
	},
	async component(interaction) {
		const count = Number(interaction.customId.split("-")[1]);

		if (isNaN(count)) {
			await interaction.reply({
				content: "Numero di dadi non valido!",
				ephemeral: true,
			});
			return;
		}
		await dice(interaction, count, true);
	},
});
