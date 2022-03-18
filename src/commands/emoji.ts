import { SlashCommandBuilder } from "@discordjs/builders";
import type {
	ApplicationCommandOptionChoice,
	InteractionReplyOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { CommandOptions } from "../util";
import { emojiInfo, emojiList } from "../util";

enum SubCommands {
	list = "list",
	info = "info",
}
enum Options {
	emoji = "emoji",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("emojis")
		.setDescription("Gestisci le emoji del server")
		.addSubcommand((list) =>
			list.setName("list").setDescription("Mostra tutte le emoji del server")
		)
		.addSubcommand((info) =>
			info
				.setName("info")
				.setDescription("Mostra le informazioni di un emoji")
				.addStringOption((emoji) =>
					emoji
						.setName("emoji")
						.setDescription("L'emoji da cercare")
						.setAutocomplete(true)
						.setRequired(true)
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
				options = await emojiList(this.client, interaction.guildId);

				await interaction.reply(options);
				break;
			case SubCommands.info:
				options = await emojiInfo(
					this.client,
					interaction.options.getString(Options.emoji, true),
					interaction.guildId ?? undefined
				);

				await interaction.reply(options);
				break;
			default:
				return interaction.reply("Comando non riconosciuto.");
		}
		return undefined;
	},
	async autocomplete(interaction) {
		const option = interaction.options.getFocused(
			true
		) as ApplicationCommandOptionChoice & { name: Options };

		switch (option.name) {
			case Options.emoji:
				option.value = option.value.toString().toLowerCase();
				const emojis = interaction.guild?.emojis.cache.filter(
					(emoji) =>
						emoji.name != null &&
						(emoji.name.toLowerCase().includes(option.value as string) ||
							emoji.id.includes(option.value as string))
				);

				if (!emojis || emojis.size <= 0) return interaction.respond([]);
				await interaction.respond(
					emojis.first(25).map((emoji) => ({
						name: `${emoji.name!} (${emoji.id})`,
						value: emoji.id,
					}))
				);
				break;
			default:
				return interaction.respond([]);
		}
		return undefined;
	},
};
