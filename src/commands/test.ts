import { bold, SlashCommandBuilder } from "@discordjs/builders";
import type { CommandOptions } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder().setName("Test").setDescription("Tost!"),
	async run(interaction) {
		return interaction.reply(
			`Tost! (WS: ${bold(
				`${interaction.client.ws.ping}ms`
			)}, interazione: ${bold(
				`${Date.now() - interaction.createdTimestamp}ms`
			)})`
		);
	},
};
