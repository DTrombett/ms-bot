import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { escapeMarkdown } from "../util/formatters";
import { maxLength } from "../util/strings";

export class Search extends Command {
	static override chatInputData = {
		name: "search",
		description: "Cerca qualcosa all'interno di un sito",
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
							{ name: "Repository", value: "repositories" },
							{ name: "Codice", value: "code" },
							{ name: "Commit", value: "commits" },
							{ name: "Issue", value: "issues" },
							{ name: "Discussioni", value: "discussions" },
							{ name: "Packages", value: "registrypackages" },
							{ name: "Marketplace", value: "marketplace" },
							{ name: "Topics", value: "topics" },
							{ name: "Wikis", value: "wikis" },
							{ name: "Utenti", value: "users" },
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
						autocomplete: true,
					},
					{
						name: "lang",
						description: "La lingua in cui cercare (default: la tua)",
						type: ApplicationCommandOptionType.String,
						choices: [
							{ name: "Italiano", value: "it" },
							{ name: "English", value: "en" },
							{ name: "Deutsch", value: "de" },
							{ name: "Русский", value: "ru" },
							{ name: "Português", value: "pt" },
							{ name: "Polski", value: "pl" },
							{ name: "中文", value: "zh" },
							{ name: "Español", value: "es" },
							{ name: "Français", value: "fr" },
							{ name: "日本語", value: "ja" },
						],
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static google = (
		{ reply }: ChatInputReplies,
		{
			options: { query },
		}: ChatInputArgs<typeof Search.chatInputData, "google">,
	) => {
		const url = `https://google.com/search?q=${encodeURIComponent(query)}`;

		reply({
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
			allowed_mentions: { parse: [] },
		});
	};
	static spotify = (
		{ reply }: ChatInputReplies,
		{
			options: { search },
		}: ChatInputArgs<typeof Search.chatInputData, "spotify">,
	) =>
		reply({
			content: `Risultati di Spotify per la ricerca "**${escapeMarkdown(
				search,
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
								search,
							)}`,
						},
					],
				},
			],
			allowed_mentions: { parse: [] },
		});
	static youtube = (
		{ reply }: ChatInputReplies,
		{
			options: { query },
		}: ChatInputArgs<typeof Search.chatInputData, "youtube">,
	) =>
		reply({
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
			allowed_mentions: { parse: [] },
		});
	static "yt-music" = (
		{ reply }: ChatInputReplies,
		{
			options: { query },
		}: ChatInputArgs<typeof Search.chatInputData, "yt-music">,
	) =>
		reply({
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
			allowed_mentions: { parse: [] },
		});
	static github = (
		{ reply }: ChatInputReplies,
		{
			options: { query, type },
		}: ChatInputArgs<typeof Search.chatInputData, "github">,
	) =>
		reply({
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
							)}${(type ?? "") && `&type=${type}`}`,
						},
					],
				},
			],
			allowed_mentions: { parse: [] },
		});
	static wikipedia = (
		{ reply }: ChatInputReplies,
		{
			interaction: { locale },
			options: { query, lang },
		}: ChatInputArgs<typeof Search.chatInputData, "wikipedia">,
	) => {
		const url = `https://${lang ?? locale.match(/[a-z]+/)?.[0] ?? "www"}.wikipedia.org/w/index.php?title=Special:Search&search=${encodeURIComponent(
			query,
		)}`;

		reply({
			content: `Risultati di Wikipedia per la ricerca **${escapeMarkdown(
				query,
			)}**[:](${url})`,
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
			allowed_mentions: { parse: [] },
		});
	};
	static "google-translate" = (
		{ reply }: ChatInputReplies,
		{
			options: { text },
			interaction: { locale },
		}: ChatInputArgs<typeof Search.chatInputData, "google-translate">,
	) =>
		reply({
			content: `Traduzione di "**${escapeMarkdown(text)}**":`,
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
								locale
							}&text=${encodeURIComponent(text)}&op=translate`,
						},
					],
				},
			],
			allowed_mentions: { parse: [] },
		});
	static override async autocomplete(
		{ autocomplete }: AutoCompleteReplies,
		{
			interaction: { locale },
			subcommand,
			options,
		}: AutoCompleteArgs<typeof Search.chatInputData>,
	) {
		if (subcommand === "wikipedia") {
			if (!options.query) return autocomplete({});
			const res = await fetch(
				`https://${options.lang ?? locale.match(/[a-z]+/)?.[0] ?? "en"}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
					options.query,
				)}`,
				{
					headers: {
						accept: "application/x-suggestions+json",
						"user-agent":
							"MS-Bot/0.0 (https://github.com/dtrombett/ms-bot; ms-bot@trombett.org) Cloudflare-Workers",
					},
				},
			);
			if (!res.ok) {
				const contentType = res.headers.get("content-type");
				const body = await ((
					contentType?.endsWith("+json") || contentType?.endsWith("/json")
				) ?
					res.json()
				:	res.text());

				console.error(body);
				throw new Error(
					`Failed to obtain search suggestions with status ${res.status} ${res.statusText}`,
				);
			}
			const suggestions =
				await res.json<
					[
						query: string,
						completions: string[],
						descriptions?: string[],
						urls?: string[],
					]
				>();

			return autocomplete({
				choices: suggestions[1]
					.slice(0, 25)
					.map((v) => ({ name: maxLength(v, 100), value: maxLength(v, 100) })),
			});
		}
	}
}
