import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";
import { ping } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder().setName("ping").setDescription("Pong!"),
	isPublic: true,
	async run(interaction) {
		return interaction.reply(await ping(this.client));
	},
};
