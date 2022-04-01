import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { love } from "../util";

enum Options {
	user1 = "user1",
	user2 = "user2",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("love")
		.setDescription("Calcola l'amore tra due utenti!")
		.addUserOption((user1) =>
			user1
				.setName(Options.user1)
				.setDescription("Il primo utente")
				.setRequired(true)
		)
		.addUserOption((user2) =>
			user2
				.setName(Options.user2)
				.setDescription("Il secondo utente (default: tu)")
		),
	isPublic: true,
	async run(interaction) {
		const user1 = interaction.options.getUser(Options.user1, true);
		const user2 =
			interaction.options.getUser(Options.user2) ?? interaction.user;

		return interaction.reply(
			await love(
				this.client,
				user1.id,
				user2.id,
				user1.discriminator,
				user2.discriminator
			)
		);
	},
};
