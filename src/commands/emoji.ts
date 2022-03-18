import { SlashCommandBuilder } from "@discordjs/builders";
import type {
	InteractionReplyOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { CommandOptions } from "../util";
import { emojiList } from "../util";

enum SubCommands {
	list = "list",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("emojis")
		.setDescription("Gestisci le emoji del server")
		.addSubcommand((list) =>
			list.setName("list").setDescription("Mostra tutte le emoji del server")
		),
	isPublic: true,
	async run(interaction) {
		if (!interaction.inCachedGuild())
			return interaction.reply({
				content: "Questo comando è disponibile solo all'interno dei server!",
				ephemeral: true,
			});
		let options: InteractionReplyOptions & WebhookEditMessageOptions;

		switch (interaction.options.getSubcommand()) {
			case SubCommands.list:
				options = await emojiList(this.client, interaction.guildId);

				await interaction.reply(options);
				break;
			default:
				return interaction.reply("Comando non riconosciuto.");
		}
		return undefined;
	},
};
