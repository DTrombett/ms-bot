import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton } from "discord.js";
import { MessageButtonStyles } from "discord.js/typings/enums";
import type { CommandOptions } from "../util";
import { DynamicConstants } from "../util";

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("invite")
		.setDescription("Invita il bot nel tuo server"),
	async run(interaction) {
		await interaction.reply({
			content: "Invita il bot nel tuo server cliccando il pulsante qui sotto!",
			components: [
				new MessageActionRow().addComponents(
					new MessageButton()
						.setLabel("Invita il bot")
						.setStyle(MessageButtonStyles.LINK)
						.setURL(DynamicConstants.inviteUrl())
						.setEmoji("🤖")
				),
			],
		});
	},
};
