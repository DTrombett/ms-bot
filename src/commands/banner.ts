import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { banner } from "../util";

enum Options {
	user = "utente",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("banner")
		.setDescription("Mostra il banner di un utente")
		.addUserOption((user) =>
			user
				.setName(Options.user)
				.setDescription("L'utente di cui mostrare il banner")
		),
	isPublic: true,
	async run(interaction) {
		const { id } =
			interaction.options.getUser(Options.user) ?? interaction.user;
		const [options] = await Promise.all([
			banner(this.client, id),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
