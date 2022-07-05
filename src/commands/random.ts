import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { random } from "../util";

enum Options {
	min = "min",
	max = "max",
}

declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Number {
		toString(): `${number}`;
	}
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("random")
		.setDescription(
			"Genera un numero casuale tra due numeri, se non specificati genera un numero decimale tra 0 e 1"
		)
		.addNumberOption((min) =>
			min.setName(Options.min).setDescription("Il numero minimo")
		)
		.addNumberOption((max) =>
			max.setName(Options.max).setDescription("Il numero massimo")
		),
	isPublic: true,
	async run(interaction) {
		await interaction.reply(
			await random(
				this.client,
				interaction.options.getNumber(Options.min)?.toString(),
				interaction.options.getNumber(Options.max)?.toString()
			)
		);
	},
};
