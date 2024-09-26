import { escapeMarkdown } from "@discordjs/formatters";
import {
	APIApplicationCommandInteractionDataBasicOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	InteractionResponseType,
} from "discord-api-types/v10";
import type { CommandOptions } from "../util";

export const search: CommandOptions<ApplicationCommandType.ChatInput> = {
	data: [
		{
			name: "search",
			description: "Cerca qualcosa all'interno di vari servizi",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "google",
					description: "Cerca qualcosa su Google",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "query",
							description: "La query da cercare",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "spotify",
					description: "Cerca brani, album, artisti e molto altro su Spotify",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "search",
							description: "La ricerca da effettuare",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "youtube",
					description: "Cerca video, playlist, canali e molto altro su Youtube",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "query",
							description: "La query da cercare",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "yt-music",
					description: "Cerca brani, album, artisti e molto altro su YT Music",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "query",
							description: "La query da cercare",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "github",
					description: "Cerca qualcosa su Github",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "query",
							description: "La query da cercare",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
						{
							name: "type",
							description: "Il tipo di ricerca da effettuare",
							type: ApplicationCommandOptionType.String,
							choices: [
								{
									name: "Repository",
									value: "repositories",
								},
								{
									name: "Codice",
									value: "code",
								},
								{
									name: "Commit",
									value: "commits",
								},
								{
									name: "Issue",
									value: "issues",
								},
								{
									name: "Discussioni",
									value: "discussions",
								},
								{
									name: "Packages",
									value: "registrypackages",
								},
								{
									name: "Marketplace",
									value: "marketplace",
								},
								{
									name: "Topics",
									value: "topics",
								},
								{
									name: "Wikis",
									value: "wikis",
								},
								{
									name: "Utenti",
									value: "users",
								},
							],
						},
					],
				},
				{
					name: "google-translate",
					description: "Traduci qualcosa",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "text",
							description: "Il testo da tradurre",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
				{
					name: "wikipedia",
					description: "Cerca qualcosa su Wikipedia",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "query",
							description: "La query da cercare",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		const options: Record<
			string,
			APIApplicationCommandInteractionDataBasicOption
		> = {};
		const subcommand = interaction.data.options!.find(
			(o): o is APIApplicationCommandInteractionDataSubcommandOption =>
				o.type === ApplicationCommandOptionType.Subcommand,
		)!;
		let query: string, url: string;

		if (subcommand.options)
			for (const option of subcommand.options) options[option.name] = option;
		switch (subcommand.name) {
			case "google":
				query = options.query!.value as string;
				url = `https://google.com/search?q=${encodeURIComponent(query)}`;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Risultati di Google per la ricerca "**[${escapeMarkdown(
							query,
						)}](${url} )**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri nel browser!",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url,
									},
								],
							},
						],
					},
				});
				break;
			case "spotify":
				query = options.search!.value as string;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Risultati di Spotify per la ricerca "**${escapeMarkdown(
							query,
						)}**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri su spotify",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url: `https://open.spotify.com/search/${encodeURIComponent(
											query,
										)}`,
									},
								],
							},
						],
					},
				});
				break;
			case "youtube":
				query = options.query!.value as string;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Risultati di YouTube per la ricerca "**${escapeMarkdown(
							query,
						)}**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri in YouTube",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url: `https://youtube.com/results?search_query=${encodeURIComponent(
											query,
										)}`,
									},
								],
							},
						],
					},
				});
				break;
			case "yt-music":
				query = options.query!.value as string;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Risultati di YouTube Music per la ricerca "**${escapeMarkdown(
							query,
						)}**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri in YouTube Music",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url: `https://music.youtube.com/search?q=${encodeURIComponent(
											query,
										)}`,
									},
								],
							},
						],
					},
				});
				break;
			case "github":
				const type = options.type?.value as string | undefined;

				query = options.query!.value as string;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Risultati di GitHub per la ricerca "**${escapeMarkdown(
							query,
						)}**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri in GitHub",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url: `https://github.com/search?q=${encodeURIComponent(
											query,
										)}${type == null ? "" : `&type=${type}`}`,
									},
								],
							},
						],
					},
				});
				break;
			case "google-translate":
				query = options.text!.value as string;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Traduzione di "**${escapeMarkdown(query)}**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri in Google Translate",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url: `https://translate.google.com/?sl=auto&tl=${
											interaction.locale
										}&text=${encodeURIComponent(query)}&op=translate`,
									},
								],
							},
						],
					},
				});
				break;
			case "wikipedia":
				query = options.query!.value as string;
				url = `https://wikipedia.org/w/index.php?search=${encodeURIComponent(
					query,
				)}`;
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Risultati di Wikipedia per la ricerca "**[${escapeMarkdown(
							query,
						)}](${url} )**":`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Apri in Wikipedia",
										style: ButtonStyle.Link,
										emoji: { name: "🔍" },
										url,
									},
								],
							},
						],
					},
				});
				break;
			default:
				throw new TypeError("Invalid subcommand", { cause: interaction });
		}
	},
};
