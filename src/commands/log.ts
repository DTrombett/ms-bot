import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	EmbedBuilder,
	codeBlock,
} from "discord.js";
import { readFile } from "node:fs/promises";
import { createCommand, printToStderr } from "../util";

export const logCommand = createCommand({
	data: [
		{
			name: "log",
			description: "Mostra gli ultimi log del bot",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "lines",
					description: "Quante righe leggere dai log (default: 10)",
					type: ApplicationCommandOptionType.Integer,
					min_value: 1,
					max_value: 100,
				},
			],
		},
	],
	isPrivate: true,
	async run(interaction) {
		printToStderr({ sus: 12 });
		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setAuthor({
						name: this.client.user.displayName,
						iconURL: this.client.user.displayAvatarURL({ extension: "png" }),
					})
					.setColor(this.client.user.accentColor ?? null)
					.setDescription(
						`${codeBlock(
							"ansi",
							(await readFile("./.log", { encoding: "utf8" }))
								.split("\n")
								.slice(-(interaction.options.getInteger("lines") ?? 10))
								.join("\n"),
						)}`,
					)
					.setTimestamp()
					.setTitle("Log"),
			],
			ephemeral: true,
		});
	},
});
