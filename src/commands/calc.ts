import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { calc } from "../util";

enum Options {
	expr = "expr",
	fractions = "fractions",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("calc")
		.setDescription("Calcola una espressione matematica")
		.addStringOption((expr) =>
			expr
				.setName(Options.expr)
				.setDescription("L'espressione da calcolare")
				.setRequired(true)
		)
		.addBooleanOption((fractions) =>
			fractions
				.setName(Options.fractions)
				.setDescription("Ritorna il risultato come frazione (default: No)")
		),
	isPublic: true,
	async run(interaction) {
		return interaction.reply(
			await calc(
				this.client,
				interaction.options.getString(Options.expr, true),
				interaction.options.getBoolean(Options.fractions) === true
					? "true"
					: "false"
			)
		);
	},
};
