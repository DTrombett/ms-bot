import { ApplicationCommandOptionType, ApplicationCommandType } from "discord-api-types/v10";
import { escapeMarkdown } from "discord.js";
import { Buffer } from "node:buffer";
import { createCommand } from "../util";

const morseAlphabet: [code: string, char: string][] = [
	[".-", "a"],
	["-...", "b"],
	["-.-.", "c"],
	["-..", "d"],
	[".", "e"],
	["..-.", "f"],
	["--.", "g"],
	["....", "h"],
	["..", "i"],
	[".---", "j"],
	["-.-", "k"],
	[".-..", "l"],
	["--", "m"],
	["-.", "n"],
	["---", "o"],
	[".--.", "p"],
	["--.-", "q"],
	[".-.", "r"],
	["...", "s"],
	["-", "t"],
	["..-", "u"],
	["...-", "v"],
	[".--", "w"],
	["-..-", "x"],
	["-.--", "y"],
	["--..", "z"],
	[".----", "1"],
	["..---", "2"],
	["...--", "3"],
	["....-", "4"],
	[".....", "5"],
	["-....", "6"],
	["--...", "7"],
	["---..", "8"],
	["----.", "9"],
	["-----", "0"],
	[".-.-.-", "."],
	["--..--", ","],
	["---...", ":"],
	["..--..", "?"],
	[".----.", "'"],
	["-....-", "-"],
	["-..-.", "/"],
	[".-..-.", '"'],
	["-.--.", "("],
	["-.--.-", ")"],
	[".-.-.", "+"],
	["-...-", "="],
	[".-...", "&"],
	[".--.-.", "@"],
	["-.-..", "ç"],
	[".--.-", "à"],
	[".-..-", "è"],
	["..-..", "é"],
];

const decodeMorse = async (morse: string) =>
	morse
		.replace("_", "-")
		.split(/\||\//)
		.map((word) =>
			word
				.split(" ")
				.map((letter) => {
					if (letter === "") return "";
					const char = morseAlphabet.find(([code]) => code === letter)?.[1];
					if (char === undefined) throw new Error(letter);
					return char;
				})
				.join("")
		)
		.join(" ");
const encodeMorse = async (text: string) =>
	text
		.split("")
		.map((letter) => {
			if (letter === " ") return "/";
			const code = morseAlphabet.find(([, char]) => char === letter)?.[0];
			if (code === undefined) throw new Error(letter);
			return code;
		})
		.join(" ");

export const command = createCommand({
	data: [
		{
			type: ApplicationCommandType.ChatInput,
			name: "translate",
			description: "Converti del testo",
			options: [
				{
					name: "morse",
					description: "Converti in morse o viceversa",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "text",
							description: "Il testo da convertire",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "base64",
					description: "Converti in base64 o viceversa",
					type: ApplicationCommandOptionType.SubcommandGroup,
					options: [
						{
							name: "decode",
							description: "Decodifica una stringa in base64",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "text",
									description: "Il testo da convertire",
									type: ApplicationCommandOptionType.String,
									required: true,
								},
							],
						},
						{
							name: "encode",
							description: "Codifica una stringa in base64",
							type: ApplicationCommandOptionType.Subcommand,
							options: [
								{
									name: "text",
									description: "Il testo da convertire",
									type: ApplicationCommandOptionType.String,
									required: true,
								},
							],
						},
					],
				},
			],
		},
	],
	async run(interaction) {
		let content = interaction.options.getString("text");

		if (content == null) {
			await interaction.reply({
				content: "Testo non valido!",
				ephemeral: true,
			});
			return;
		}
		if (interaction.options.data[0].name === "morse") {
			let ephemeral = false;

			content = content.trim().toLowerCase();
			if (/^[-._/| ]+$/.test(content))
				content = await decodeMorse(content).catch(({ message }: Error) => {
					ephemeral = true;
					return `Carattere non valido nel codice morse: \`${message}\``;
				});
			else
				content = await encodeMorse(content).catch(({ message }: Error) => {
					ephemeral = true;
					return `Carattere non valido nel testo: \`${message}\``;
				});
			await interaction.reply({
				content,
				ephemeral,
			});
			return;
		}
		if (interaction.options.data[0].name === "base64") {
			if (interaction.options.getSubcommand() === "decode") {
				const buf = Buffer.from(content, "base64");

				if (buf.toString("base64") !== content) {
					await interaction.reply({
						content: "Testo non valido!",
						ephemeral: true,
					});
					return;
				}
				content = escapeMarkdown(buf.toString());
			} else content = Buffer.from(content).toString("base64");
			await interaction.reply({
				content,
			});
		}
	},
});
