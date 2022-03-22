import { SlashCommandBuilder } from "@discordjs/builders";
import type {
	ApplicationCommandOptionChoice,
	InteractionReplyOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { CommandOptions } from "../util";
import { createEmoji, emojiInfo, emojiList } from "../util";

enum SubCommands {
	list = "list",
	info = "info",
	create = "create",
}
enum Options {
	emoji = "emoji",
	page = "page",
	file = "file",
	name = "name",
	reason = "reason",
	roles = "roles",
}

export const command: CommandOptions = {
	data: new SlashCommandBuilder()
		.setName("emojis")
		.setDescription("Gestisci le emoji del server")
		.addSubcommand((list) =>
			list
				.setName(SubCommands.list)
				.setDescription("Mostra tutte le emoji del server")
				.addIntegerOption((page) =>
					page
						.setName(Options.page)
						.setDescription(
							"Pagina da mostrare - Ogni pagina contiene 25 emoji"
						)
						.setMaxValue(10)
				)
		)
		.addSubcommand((info) =>
			info
				.setName(SubCommands.info)
				.setDescription("Mostra le informazioni di un emoji")
				.addStringOption((emoji) =>
					emoji
						.setName(Options.emoji)
						.setDescription("L'emoji da cercare")
						.setAutocomplete(true)
						.setRequired(true)
				)
		)
		.addSubcommand((create) =>
			create
				.setName(SubCommands.create)
				.setDescription("Carica un emoji")
				.addAttachmentOption((file) =>
					file
						.setName(Options.file)
						.setDescription(
							"L'immagine da caricare. Tipo: .png, .jpg, .gif, .webp. Dimensione max: 256kb"
						)
						.setRequired(true)
				)
				.addStringOption((name) =>
					name
						.setName(Options.name)
						.setDescription(
							"Il nome dell'emoji, lungo almeno 2 caratteri e con solo caratteri alfanumerici e trattini bassi"
						)
						.setRequired(true)
				)
				.addStringOption((reason) =>
					reason
						.setName(Options.reason)
						.setDescription("Il motivo per cui stai caricando l'emoji")
				)
				.addStringOption((roles) =>
					roles
						.setName(Options.roles)
						.setDescription("I ruoli da assegnare all'emoji")
						.setAutocomplete(true)
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
				options = await emojiList(
					this.client,
					interaction.guildId,
					`${interaction.options.getInteger(Options.page) ?? ""}` || undefined
				);

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
			case SubCommands.create:
				if (!interaction.inCachedGuild())
					return interaction.reply({
						content:
							"Questo comando è disponibile solo all'interno dei server!",
						ephemeral: true,
					});
				[options] = await Promise.all([
					createEmoji(
						this.client,
						interaction.guildId,
						interaction.options.getAttachment(Options.file, true).proxyURL,
						interaction.options.getString(Options.name, true),
						interaction.user.id,
						interaction.options.getString(Options.reason) ?? undefined,
						...(interaction.options.getString(Options.roles)?.split(/,\s*/) ??
							[])
					),
					interaction.deferReply(),
				]);

				await interaction.editReply(options);
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
