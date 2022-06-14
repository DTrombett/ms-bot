import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { rps } from "../util";

enum Options {
	choice = "scelta",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("rps")
		.setDescription("Gioca a sasso, carta, forbici")
		.addStringOption((choice) =>
			choice
				.setName(Options.choice)
				.setDescription("La tua scelta")
				.setRequired(true)
				.addChoices(
					{ name: "Sasso", value: "rock" },
					{ name: "Carta", value: "paper" },
					{ name: "Forbici", value: "scissors" }
				)
		),
	isPublic: true,
	async run(interaction) {
		await interaction.reply(
			await rps(
				this.client,
				interaction.options.getString(Options.choice, true) as
					| "paper"
					| "rock"
					| "scissors"
			)
		);
	},
};
