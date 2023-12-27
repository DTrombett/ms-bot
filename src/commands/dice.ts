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
	count = 1,
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
		content: `🎲 **${result}** ${
			count > 1 ? `(${results.join(", ")})` : ""
		}con ${count} dad${count === 1 ? "o" : "i"}!`,
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
		await dice(
			interaction,
			interaction.options.getInteger("count") ?? undefined,
		);
	},
	async component(interaction) {
		await dice(interaction, Number(interaction.customId.split("-")[1]), true);
	},
});
