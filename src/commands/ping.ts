import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder().setName("ping").setDescription("Pong!"),
	isPublic: true,
	async run(interaction) {
		return interaction.reply({
			content: `Pong! Latency is **${this.client.ws.ping}ms**.`,
		});
	},
};
