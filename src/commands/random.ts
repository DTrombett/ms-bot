import {
	APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { createCommand, randomNumber } from "../util";

const getRandom = (
	{ min, max }: Partial<{ min: number; max: number }>,
	ephemeral = false,
): APIInteractionResponseCallbackData => {
	if (typeof min !== typeof max)
		return {
			content:
				"Devi specificare sia il minimo che il massimo o nessuno dei due se vuoi un numero decimale tra 0 e 1",
			flags: MessageFlags.Ephemeral,
		};
	return {
		content: `🎲 ${randomNumber(min, max)}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Genera un altro!",
						style: ButtonStyle.Primary,
						emoji: { name: "🎲" },
						custom_id: `random-${min ?? "NaN"}-${max ?? "NaN"}`,
					},
				],
			},
		],
		flags: ephemeral ? MessageFlags.Ephemeral : undefined,
	};
};

export const random = createCommand({
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
	run(interaction, { reply }) {
		const options: Partial<{ min: number; max: number }> = {};

		if (interaction.data.options?.length)
			for (const option of interaction.data.options)
				if (option.type === ApplicationCommandOptionType.Integer)
					options[option.name as "max" | "min"] = option.value;
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: getRandom(options),
		});
	},
	component(interaction, { reply }) {
		const [, min, max] = interaction.data.custom_id.split("-");

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: getRandom(
				{ min: Number(min) || undefined, max: Number(max) || undefined },
				true,
			),
		});
	},
});
