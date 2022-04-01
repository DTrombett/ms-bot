import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { dog } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("dog")
		.setDescription("Guarda l'immagine di un adorabile cagnolino"),
	isPublic: true,
	async run(interaction) {
		const [options] = await Promise.all([
			dog(this.client),
			interaction.deferReply(),
		]);

		return void (await interaction.editReply(options));
	},
};
