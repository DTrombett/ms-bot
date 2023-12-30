import {
	APIApplicationCommandInteractionDataStringOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { createCommand, randomNumber } from "../util";

type PossibleChoice = (typeof choices)[number];

const choices = ["rock", "paper", "scissors"] as const;
const emojis: Record<PossibleChoice, string> = {
	rock: "✊",
	paper: "✋",
	scissors: "✌",
};
const winners: Record<PossibleChoice, PossibleChoice> = {
	rock: "paper",
	paper: "scissors",
	scissors: "rock",
};

export const rps = createCommand({
	data: [
		{
			name: "rps",
			description: "Gioca a sasso, carta, forbici",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "choice",
					description: "La tua scelta",
					type: ApplicationCommandOptionType.String,
					required: true,
					choices: [
						{
							name: "Sasso",
							value: "rock",
						},
						{
							name: "Carta",
							value: "paper",
						},
						{
							name: "Forbici",
							value: "scissors",
						},
					],
				},
			],
		},
	],
	async run(interaction, { reply }) {
		const choice = interaction.data.options!.find(
			(o): o is APIApplicationCommandInteractionDataStringOption =>
				o.name === "choice" && o.type === ApplicationCommandOptionType.String,
		)!.value as PossibleChoice;

		if (!choices.includes(choice)) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "La tua scelta non è valida!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const myChoice = choices[randomNumber(0, 2)]!;

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: `Hai scelto ${emojis[choice]}\nLa mia scelta è ${
					emojis[myChoice]
				}\n\n**${
					myChoice === choice
						? "Pareggio"
						: winners[myChoice] === choice
							? "Hai vinto"
							: "Hai perso"
				}**!`,
			},
		});
	},
});
