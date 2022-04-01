import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { cat } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("cat")
		.setDescription("Guarda l'immagine di un adorabile gatto"),
	isPublic: true,
	async run(interaction) {
		const [options] = await Promise.all([
			cat(this.client),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
