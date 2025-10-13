import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	escapeMarkdown,
	type ChatInputArgs,
	type ChatInputReplies,
} from "../util/index.ts";

export class Search extends Command {
	static override chatInputData = {
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
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	google = (
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
		});
	};
	spotify = (
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
		});
	youtube = (
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
		});
	"yt-music" = (
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
		});
	github = (
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
		});
	wikipedia = (
		{ reply }: ChatInputReplies,
		{
			options: { query },
		}: ChatInputArgs<typeof Search.chatInputData, "wikipedia">,
	) => {
		const url = `https://wikipedia.org/w/index.php?search=${encodeURIComponent(
			query,
		)}`;

		reply({
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
		});
	};
	"google-translate" = (
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
		});
}
