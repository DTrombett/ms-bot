import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("icon")
		.setDescription("Mostra l'icona del server"),
	isPublic: true,
	async run(interaction) {
		const { guild } = interaction;

		if (!guild)
			return interaction.reply({
				content: "Questo comando è disponibile solo in un server!",
				ephemeral: true,
			});
		const icon = guild.iconURL({
			extension: "png",
			forceStatic: false,
			size: 4096,
		});

		if (icon == null)
			return interaction.reply({
				content: "Questo server non ha un'icona!",
				ephemeral: true,
			});
		return interaction.reply({
			content: `[Icona di ${guild.name}](${icon} ):`,
		});
	},
};
