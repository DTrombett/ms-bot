import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";

enum SubCommands {
	user = "utente",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("avatar")
		.setDescription("Mostra l'avatar di un utente")
		.addUserOption((user) =>
			user
				.setName(SubCommands.user)
				.setDescription("L'utente di cui mostrare l'avatar")
		),
	isPublic: true,
	async run(interaction) {
		const user =
			interaction.options.getUser(SubCommands.user) ?? interaction.user;
		const avatar = user.displayAvatarURL({
			extension: "png",
			forceStatic: false,
			size: 4096,
		});

		return interaction.reply({
			content: `[Avatar di ${user.tag}](${avatar} ):`,
		});
	},
};
