import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { predict } from "../util";

enum Options {
	question = "domanda",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("predict")
		.setDescription("Lascia il bot fare un predict!")
		.addStringOption((query) =>
			query
				.setName(Options.question)
				.setRequired(true)
				.setDescription("La domanda da porre")
		),
	isPublic: true,
	async run(interaction) {
		await interaction.reply(
			await predict(
				this.client,
				interaction.options.getString(Options.question, true)
			)
		);
	},
};
