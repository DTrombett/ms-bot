import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { google } from "../util";

enum Options {
	query = "ricerca",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("google")
		.setDescription("Cerca qualcosa su Google!")
		.addStringOption((query) =>
			query
				.setName(Options.query)
				.setRequired(true)
				.setDescription("Il testo da cercare")
		),
	isPublic: true,
	async run(interaction) {
		await interaction.reply(
			await google(
				this.client,
				interaction.options.getString(Options.query, true)
			)
		);
	},
};
