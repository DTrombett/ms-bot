import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	GuildTextBasedChannel,
	PermissionFlagsBits,
} from "discord.js";
import { parseFeed } from "htmlparser2";
import { request } from "undici";
import {
	createCommand,
	createFeed,
	createFeedMessageOptions,
	deleteFeed,
	feeds,
	normalizeError,
	sendError,
} from "../util";

export const rssCommand = createCommand({
	data: [
		{
			name: "rss",
			default_member_permissions: String(PermissionFlagsBits.Administrator),
			description: "Segui un feed RSS o mostra quelli già seguiti",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "add",
					description: "Segui un nuovo feed",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "link",
							description: "Il link del feed da seguire",
							required: true,
							type: ApplicationCommandOptionType.String,
						},
						{
							name: "channel",
							description: "Il canale dove seguire il feed",
							required: true,
							type: ApplicationCommandOptionType.Channel,
						},
					],
				},
				{
					name: "test",
					description: "Controlla un feed inviando l'ultimo aggiornamento",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "feed",
							description: "Il feed da provare",
							required: true,
							type: ApplicationCommandOptionType.String,
							autocomplete: true,
						},
					],
				},
				{
					name: "delete",
					description: "Elimina un feed",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "feed",
							description: "Il feed da eliminare",
							required: true,
							type: ApplicationCommandOptionType.String,
							autocomplete: true,
						},
					],
				},
			],
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand()) {
			case "add": {
				const link = interaction.options.getString("link", true);

				if (
					feeds.find(
						(feed) => feed.link === link && feed.guild === interaction.guildId,
					)
				) {
					await interaction.reply({
						content: "Stai già seguendo questo feed!",
						ephemeral: true,
					});
					return;
				}
				const channel = interaction.options.getChannel("channel", true);

				if (!("client" in channel && "send" in channel)) {
					await interaction.reply({
						content: "Canale non valido!",
						ephemeral: true,
					});
					return;
				}
				const feed = parseFeed(
					await request(link, { bodyTimeout: 10_000, headersTimeout: 10_000 })
						.then((res) => res.body.text())
						.catch(() => ""),
					{ xmlMode: true },
				);

				if (!feed) {
					await interaction.reply({
						content: "Questo feed non è valido!",
						ephemeral: true,
					});
					return;
				}
				await createFeed({
					channel: channel.id,
					guild: interaction.guildId!,
					link,
					title: feed.title,
				});
				await interaction.reply({
					content: `Feed [${feed.title ?? "senza nome"}](${link}) creato!`,
					ephemeral: true,
				});
				break;
			}
			case "delete": {
				const id = interaction.options.getString("feed", true);
				let rss = feeds.get(id);

				if (rss?.guild !== interaction.guildId)
					rss = feeds.find(
						(feed) => feed.title === id && feed.guild === interaction.guildId,
					);
				if (!rss) {
					await interaction.reply({
						ephemeral: true,
						content: "Feed non trovato!",
					});
					return;
				}
				await deleteFeed(rss.id);
				await interaction.reply({
					ephemeral: true,
					content: "Feed eliminato!",
				});
				break;
			}
			case "test": {
				const id = interaction.options.getString("feed", true);
				let rss = feeds.get(id);

				if (rss?.guild !== interaction.guildId)
					rss = feeds.find(
						(feed) => feed.title === id && feed.guild === interaction.guildId,
					);
				if (!rss) {
					await interaction.reply({
						ephemeral: true,
						content: "Feed non trovato!",
					});
					return;
				}
				const feed = parseFeed(
					await request(rss.link, {
						bodyTimeout: 10_000,
						headersTimeout: 10_000,
					})
						.then((res) => res.body.text())
						.catch(() => ""),
					{ xmlMode: true },
				);

				if (!feed) {
					await interaction.reply({
						content: "Il feed non è valido!",
						ephemeral: true,
					});
					return;
				}
				const channel = (await this.client.channels
					.fetch(rss.channel)
					.catch(() => {})) as GuildTextBasedChannel | null;

				if (!channel) {
					await interaction.reply({
						content: "Canale non trovato!",
						ephemeral: true,
					});
					return;
				}
				feed.items.splice(1);
				const error = await channel
					.send(createFeedMessageOptions(feed))
					.catch(normalizeError);

				if (error instanceof Error) {
					await sendError(interaction, error);
					return;
				}
				await interaction.reply({
					content: "Ultimo aggiornamento inviato con successo!",
					ephemeral: true,
				});
				break;
			}
			default:
				break;
		}
	},
	async autocomplete(interaction) {
		const query = interaction.options.getString("feed")?.toLowerCase() ?? "";

		await interaction.respond(
			feeds
				.filter(
					(t) =>
						t.guild === interaction.guildId &&
						(t.title ?? t.link).toLowerCase().includes(query),
				)
				.map((t) => ({
					name: t.title ?? t.link,
					value: t.id,
				}))
				.slice(0, 25),
		);
	},
});
