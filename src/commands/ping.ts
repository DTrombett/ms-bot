import { bold, SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder().setName("ping").setDescription("Pong!"),
	async run(interaction) {
		return interaction.reply(
			`Pong! (${bold(`${interaction.client.ws.ping}ms`)})`
		);
	},
};
