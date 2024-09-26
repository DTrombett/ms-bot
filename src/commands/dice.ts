import {
	APIApplicationCommandInteractionDataIntegerOption,
	APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { Command, randomNumber } from "../util";

const roll = (
	count = 1,
	ephemeral = false,
): APIInteractionResponseCallbackData => {
	if (count < 1 || count > 100)
		return {
			content: "Il numero dei dadi deve essere compreso tra 1 e 100!",
			flags: MessageFlags.Ephemeral,
		};
	const results: number[] = [];
	let result = 0;

	for (let i = 0; i < count; i++) {
		const n = randomNumber(1, 6);

		result += n;
		results.push(n);
	}
	return {
		content: `🎲 **${result}** ${
			count > 1 ? `(${results.join(", ")})` : ""
		} con ${count} dad${count === 1 ? "o" : "i"}!`,
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
		flags: ephemeral ? MessageFlags.Ephemeral : undefined,
	};
};

export const dice = new Command({
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
	run: (reply, { interaction }) => {
		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: roll(
				interaction.data.options?.find(
					(o): o is APIApplicationCommandInteractionDataIntegerOption =>
						o.name === "count" &&
						o.type === ApplicationCommandOptionType.Integer,
				)?.value,
			),
		});
	},
	component: (reply, { interaction }) => {
		const [, count] = interaction.data.custom_id.split("-");

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: roll(parseInt(count!) || undefined, true),
		});
	},
});
