import { SlashCommandBuilder } from "@discordjs/builders";
import type { Snowflake } from "discord-api-types/v10";
import type {
	ApplicationCommandOptionChoiceData,
	InteractionReplyOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { CommandOptions } from "../util";
import {
	createEmoji,
	deleteEmoji,
	editEmoji,
	emojiInfo,
	emojiList,
} from "../util";

enum SubCommands {
	list = "list",
	info = "info",
	create = "create",
	delete = "delete",
	edit = "edit",
}
enum Options {
	emoji = "emoji",
	page = "page",
	file = "file",
	name = "name",
	reason = "reason",
	role = "role",
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
				.addRoleOption((role) =>
					role
						.setName(Options.role)
						.setDescription("Il ruolo che può utilizzare questa emoji")
				)
		)
		.addSubcommand((del) =>
			del
				.setName(SubCommands.delete)
				.setDescription("Elimina un emoji")
				.addStringOption((emoji) =>
					emoji
						.setName(Options.emoji)
						.setDescription("L'emoji da eliminare")
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption((reason) =>
					reason
						.setName(Options.reason)
						.setDescription("Il motivo per cui stai eliminando l'emoji")
				)
		)
		.addSubcommand((edit) =>
			edit
				.setName(SubCommands.edit)
				.setDescription("Modifica un emoji")
				.addStringOption((emoji) =>
					emoji
						.setName(Options.emoji)
						.setDescription("L'emoji da modificare")
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption((name) =>
					name.setName(Options.name).setDescription("Il nuovo nome dell'emoji")
				)
				.addRoleOption((role) =>
					role
						.setName(Options.role)
						.setDescription("Il ruolo che può utilizzare questa emoji")
				)
				.addStringOption((reason) =>
					reason
						.setName(Options.reason)
						.setDescription("Il motivo per cui stai modificando l'emoji")
				)
		),
	isPublic: true,
	async run(interaction) {
		let options: InteractionReplyOptions & WebhookEditMessageOptions;

		switch (interaction.options.getSubcommand()) {
			case SubCommands.list:
				if (!interaction.inCachedGuild()) {
					await interaction.reply({
						content:
							"Questo comando è disponibile solo all'interno dei server!",
						ephemeral: true,
					});
					return;
				}
				const page = interaction.options.getInteger(Options.page);

				options = await emojiList(
					this.client,
					interaction.guildId,
					page != null ? `${page - 1}` : undefined
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
				if (!interaction.inCachedGuild()) {
					await interaction.reply({
						content:
							"Questo comando è disponibile solo all'interno dei server!",
						ephemeral: true,
					});
					return;
				}
				[options] = await Promise.all([
					createEmoji(
						this.client,
						interaction.guildId,
						interaction.options.getAttachment(Options.file, true).proxyURL,
						interaction.options.getString(Options.name, true),
						interaction.user.id,
						interaction.options.getString(Options.reason) ?? undefined,
						...[interaction.options.getRole(Options.role)?.id].filter(
							(id): id is Snowflake => id != null
						)
					),
					interaction.deferReply(),
				]);

				await interaction.editReply(options);
				break;
			case SubCommands.delete:
				if (!interaction.inCachedGuild()) {
					await interaction.reply({
						content:
							"Questo comando è disponibile solo all'interno dei server!",
						ephemeral: true,
					});
					return;
				}
				[options] = await Promise.all([
					deleteEmoji(
						this.client,
						interaction.options.getString(Options.emoji, true),
						interaction.guildId,
						interaction.user.id,
						interaction.options.getString(Options.reason) ?? undefined
					),
					interaction.deferReply(),
				]);

				await interaction.editReply(options);
				break;
			case SubCommands.edit:
				if (!interaction.inCachedGuild()) {
					await interaction.reply({
						content:
							"Questo comando è disponibile solo all'interno dei server!",
						ephemeral: true,
					});
					return;
				}
				[options] = await Promise.all([
					editEmoji(
						this.client,
						interaction.options.getString(Options.emoji, true),
						interaction.guildId,
						interaction.options.getString(Options.name) ?? undefined,
						interaction.user.id,
						interaction.options.getString(Options.reason) ?? undefined,
						...[interaction.options.getRole(Options.role)?.id].filter(
							(id): id is Snowflake => id != null
						)
					),
					interaction.deferReply(),
				]);

				await interaction.editReply(options);
				break;
			default:
				await interaction.reply("Comando non riconosciuto.");
		}
	},
	async autocomplete(interaction) {
		const option = interaction.options.getFocused(
			true
		) as ApplicationCommandOptionChoiceData & { name: Options };

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
