import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits,
} from "discord.js";
import { parseFeed } from "htmlparser2";
import { request } from "undici";
import { RSS } from "../models";
import { createCommand, createFeed } from "../util";

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
			],
		},
	],
	async run(interaction) {
		switch (interaction.options.getSubcommand()) {
			case "add":
				const link = interaction.options.getString("link", true);

				if (await RSS.exists({ link, guild: interaction.guildId })) {
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
				});
				await interaction.reply({
					content: `Feed [${feed.title ?? "senza nome"}](${link}) creato!`,
					ephemeral: true,
				});
				break;
			default:
				break;
		}
	},
});
