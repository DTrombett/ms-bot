import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord.js";
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

export const rpsCommand = createCommand({
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
	async run(interaction) {
		const choice = interaction.options.data[0].value as PossibleChoice;

		if (!choices.includes(choice)) {
			await interaction.reply({
				content: "La tua scelta non è valida!",
				ephemeral: true,
			});
			return;
		}
		const myChoice = choices[randomNumber(0, 2)];

		await interaction.reply({
			content: `Hai scelto ${emojis[choice]}\nLa mia scelta è ${
				emojis[myChoice]
			}\n\n**${
				myChoice === choice
					? "Pareggio"
					: winners[myChoice] === choice
					? "Hai vinto"
					: "Hai perso"
			}**!`,
		});
	},
});
