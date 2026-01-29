import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	MessageFlags,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { fetchCache } from "../util/fetchCache.ts";
import { TimeUnit } from "../util/time.ts";

export class Share extends Command {
	static readonly "USER_AGENT" =
		"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
	static override "chatInputData" = {
		name: "share",
		description: "Condividi contenuti da una serie di siti web",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "tiktok",
				description: "Condividi un video di TikTok",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "url",
						description: "Il link al video o il suo ID",
						type: ApplicationCommandOptionType.String,
						required: true,
					},
					{
						name: "hide",
						description: "Se nascondere il messaggio dagli altri",
						type: ApplicationCommandOptionType.Boolean,
						required: false,
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static "tiktok" = async (
		{ defer, edit }: ChatInputReplies,
		{
			options: { url, hide },
			interaction: { locale },
		}: ChatInputArgs<typeof Share.chatInputData, "tiktok">,
	) => {
		const idRegex = /^\d+$/;
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });
		if (URL.canParse(url)) {
			const parsed = new URL(url);

			if (parsed.host === "vm.tiktok.com") {
				const res = await fetch(parsed, { redirect: "manual" });

				url = res.headers.get("location")!;
				if (URL.canParse(url)) parsed.href = url;
			}
			if (parsed.host === "www.tiktok.com" || parsed.host === "tiktok.com")
				url = parsed.pathname.split("/").findLast((v) => idRegex.test(v))!;
		}
		if (!idRegex.test(url)) return edit({ content: "L'URL non è valido!" });
		const input = new URL(
			`https://www.tiktok.com/player/v1/${url}?__loader=layout&__ssrDirect=true`,
		);
		const device_id =
			(await fetchCache(
				input,
				{
					headers: {
						"User-Agent": this.USER_AGENT,
						"Referer": `https://www.tiktok.com/player/v1/${url}`,
					},
				},
				TimeUnit.Day / TimeUnit.Second,
			)
				.then((res) => res.json<{ wid: unknown }>())
				// eslint-disable-next-line @typescript-eslint/require-await
				.then(async (j) => (typeof j.wid === "string" ? j.wid : ""))
				.catch(console.error)) ?? "";
		const [browser_name, browser_version] = this.USER_AGENT.split(/\/(.+)/) as [
			string,
			string,
		];

		input.pathname = "/player/api/v1/items";
		input.search = new URLSearchParams({
			item_ids: url,
			language: locale,
			aid: "1284",
			app_name: "tiktok_web",
			device_platform: "web_pc",
			region: "JP",
			priority_region: "JP",
			os: "windows",
			referer: "",
			screen_width: "1280",
			screen_height: "720",
			browser_language: locale,
			browser_platform: "Win32",
			browser_name,
			browser_version,
			browser_online: "true",
			app_language: locale.split("-")[0]!,
			timezone_name: "UTC",
			is_page_visible: "true",
			focus_state: "true",
			is_fullscreen: "false",
			history_len: "2",
			security_verification_aid: "",
			device_id,
		}).toString();
		const res = await fetchCache(
			input,
			{
				headers: {
					"User-Agent": this.USER_AGENT,
					"Referer": `https://www.tiktok.com/player/v1/${url}`,
					"agw-js-conv": "str",
				},
			},
			TimeUnit.Day / TimeUnit.Second,
		)
			.then((res) =>
				res.json<{
					status_code: number;
					status_message: string;
					items: {
						author_info: {
							avatar_url_list: string[];
							nickname: string;
							secret_id: string;
							unique_id: string;
						};
						desc: string;
						id: number;
						id_str: string;
						marker_info: { branded_content_type: number; is_ads: boolean };
						music_info: {
							author: string;
							id: number;
							id_str: string;
							title: string;
						};
						other_info: unknown;
						region: string;
						statistics_info: {
							comment_count: number;
							digg_count: number;
							share_count: number;
						};
						video_info: {
							meta: {
								bitrate: number;
								duration: number;
								height: number;
								ratio: number;
								width: number;
							};
							uri: string;
							url_list: string[];
						};
					}[];
				}>(),
			)
			.catch(console.error);

		if (!res || res.status_code !== 0 || !res.items[0])
			return edit({
				content: `Si è verificato un errore: \`${res?.status_message.replaceAll("`", "\\`") || "Errore sconosciuto"}\``,
			});
		await edit({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{
					type: ComponentType.Section,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `## [${res.items[0].author_info.nickname}](https://www.tiktok.com/@${res.items[0].author_info.unique_id})\n${res.items[0].desc}\n[Apri in TikTok](https://www.tiktok.com/@${res.items[0].author_info.unique_id}/video/${url})`,
						},
					],
					accessory: {
						type: ComponentType.Thumbnail,
						media: { url: res.items[0].author_info.avatar_url_list[0]! },
					},
				},
				{
					type: ComponentType.MediaGallery,
					items: [{ media: { url: res.items[0].video_info.url_list[0]! } }],
				},
				{
					type: ComponentType.TextDisplay,
					content: `-# ❤️ ${res.items[0].statistics_info.digg_count.toLocaleString(locale)}\t⛓️‍💥 ${res.items[0].statistics_info.share_count.toLocaleString(locale)}\t🗨️ ${res.items[0].statistics_info.comment_count.toLocaleString(locale)}`,
				},
			],
			allowed_mentions: { parse: [] },
		}).catch(console.error);
	};
}
