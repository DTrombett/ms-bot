import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { dice } from "../util";

enum Options {
	count = "count",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("dice")
		.setDescription("Tira il dado!")
		.addIntegerOption((count) =>
			count
				.setName(Options.count)
				.setDescription("Numero di dadi da tirare (default: 1)")
		),
	isPublic: true,
	async run(interaction) {
		const count = interaction.options.getInteger(Options.count);

		return interaction.reply(
			await dice(this.client, `${count ?? ""}` || undefined)
		);
	},
};
