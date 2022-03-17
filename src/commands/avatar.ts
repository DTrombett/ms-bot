import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { avatar } from "../util";

enum Options {
	user = "utente",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("avatar")
		.setDescription("Mostra l'avatar di un utente")
		.addUserOption((user) =>
			user
				.setName(Options.user)
				.setDescription("L'utente di cui mostrare l'avatar")
		),
	isPublic: true,
	async run(interaction) {
		const { id } =
			interaction.options.getUser(Options.user) ?? interaction.user;
		const [options] = await Promise.all([
			avatar(this.client, id, interaction.guildId ?? undefined),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
