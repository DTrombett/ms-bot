import { SlashCommandBuilder } from "@discordjs/builders";
import type {
	InteractionReplyOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { CommandOptions } from "../util";
import { bannList } from "../util";

enum SubCommands {
	list = "list",
}
enum Options {
	page = "page",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("bans")
		.setDescription("Gestisci i bann del server")
		.addSubcommand((list) =>
			list
				.setName(SubCommands.list)
				.setDescription("Mostra tutti i bann del server")
				.addIntegerOption((page) =>
					page
						.setName(Options.page)
						.setDescription("Pagina da mostrare - Ogni pagina contiene 25 bann")
				)
		),
	isPublic: true,
	async run(interaction) {
		let options: InteractionReplyOptions & WebhookEditMessageOptions;

		switch (interaction.options.getSubcommand()) {
			case SubCommands.list:
				if (!interaction.inCachedGuild())
					return interaction.reply({
						content:
							"Questo comando è disponibile solo all'interno dei server!",
						ephemeral: true,
					});
				const page = interaction.options.getInteger(Options.page);

				options = await bannList(
					this.client,
					interaction.guildId,
					page != null ? `${page - 1}` : undefined
				);

				await interaction.reply(options);
				break;
			default:
				return interaction.reply("Comando non riconosciuto.");
		}
		return undefined;
	},
};
