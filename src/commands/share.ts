import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	MessageFlags,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { fetchCache } from "../util/fetchCache.ts";
import { findJSObjectAround } from "../util/stringParsing.ts";
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
			{
				name: "twitter",
				description: "Condividi un post Twitter (X)",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "url",
						description: "Il link al post o il suo ID",
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
				const res = await fetchCache(
					parsed,
					{ redirect: "manual" },
					TimeUnit.Day / TimeUnit.Second,
				);

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
			device_id: (
				7598128498410554902n +
				BigInt(Math.round(Math.random() * Number.MAX_SAFE_INTEGER))
			).toString(),
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
	private static readonly "REAL_USER_AGENT" =
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

	static "twitter" = async (
		{ defer, edit, reply }: ChatInputReplies,
		{
			options: { url, hide },
			interaction: { locale },
		}: ChatInputArgs<typeof Share.chatInputData, "twitter">,
	) => {
		const idRegex = /^\d+$/;
		if (!URL.canParse(url))
			if (idRegex.test(url)) url = `https://x.com/i/status/${url}`;
			else
				return reply({
					flags: MessageFlags.Ephemeral,
					content: "L'URL non è valido!",
				});
		const parsed = new URL(url);
		const tweetId = parsed.pathname.split("/").at(-1)!;

		if (
			!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
				parsed.host,
			) ||
			!idRegex.test(tweetId)
		)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "L'URL non è valido!",
			});
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });
		const response = await fetch(parsed, {
			headers: {
				"Accept": "text/html",
				"accept-language": locale,
				"User-Agent": this.REAL_USER_AGENT,
			},
		});
		const body = `${await response.text()}</body></html>`;
		let match = body.match(/featureSwitch["']?\s*:\s*{/);
		if (!match)
			return edit({ content: "Impossibile estrarre il contenuto dal tweet" });
		const featureSwitch = findJSObjectAround<{
			defaultConfig: Record<string, { value: unknown }>;
			user: { config: Record<string, { value: unknown }> };
			debug: object;
			featureSetToken: string;
			isLoaded: boolean;
			isLoading: boolean;
			customOverrides: object;
		}>(body, match.index! + match[0].length - 1, 0);
		match = body.match(/document\s*\.\s*cookie\s*=\s*["']gt=([^;]+)/);
		if (!match?.[1])
			return edit({ content: "Impossibile estrarre il contenuto dal tweet!" });
		const gt = match[1];
		match = body.match(/["']guestId["']\s*:\s*["']([^"']+)["']/);
		if (!match?.[1])
			return edit({ content: "Impossibile estrarre il contenuto dal tweet!!" });
		const guestId = match[1];
		const { resolve, reject, promise } = Promise.withResolvers<string>();
		({ url } = response);
		new HTMLRewriter()
			.on('link[href*="/main."]', {
				element: (element) =>
					resolve(new URL(element.getAttribute("href")!, url).href),
			})
			.onDocument({ end: reject })
			.transform(new Response(body));
		url = await promise.catch(() => "");
		if (url === "")
			return edit({
				content: "Impossibile estrarre il contenuto dal tweet!!!",
			});
		const js = await fetch(url, {
			headers: {
				"Accept": "text/javascript",
				"accept-language": locale,
				"User-Agent": this.REAL_USER_AGENT,
			},
		}).then((res) => res.text());
		const authorization = js.match(/Bearer \w[^"']+/)?.[0];
		if (!authorization)
			return edit({
				content: "Impossibile estrarre il contenuto dal tweet!!!!",
			});
		const trbri = findJSObjectAround<{
			queryId: string;
			operationName: string;
			operationType: string;
			metadata: { featureSwitches: string[]; fieldToggles: string[] };
		}>(js, js.indexOf('"TweetResultByRestId"'));
		const res = await fetch(
			`https://api.x.com/graphql/${trbri.queryId}/TweetResultByRestId?${new URLSearchParams(
				{
					variables: JSON.stringify({
						tweetId,
						withCommunity: false,
						includePromotedContent: false,
						withVoice: false,
					}),
					features: JSON.stringify(
						Object.fromEntries(
							trbri.metadata.featureSwitches.map((v) => [
								v,
								featureSwitch.user.config[v]?.value ??
									featureSwitch.defaultConfig[v]?.value,
							]),
						),
					),
					fieldToggles: JSON.stringify({
						withArticleRichContentState: true,
						withArticlePlainText: false,
						withGrokAnalyze: false,
						withDisallowedReplyControls: false,
					}),
				},
			).toString()}`,
			{
				headers: {
					"Accept": "application/json",
					"Accept-Language": locale,
					"Authorization": authorization,
					"User-Agent": this.REAL_USER_AGENT,
					"x-guest-token": gt,
					"x-twitter-active-user": "yes",
					"x-twitter-client-language": locale,
					"Cookie": `guest_id=v1%3A${guestId}; gt=${gt}`,
					"Content-Type": "application/json",
					"Origin": "https://x.com",
				},
				method: "GET",
			},
		);
		if (!res.ok)
			return edit({
				content: `Si è verificato un errore imprevisto: ${res.status} ${res.statusText}`,
			});
		const { data } = await res.json<TweetResultByRestId>();
		console.log(data.tweetResult.result);
		return edit({ content: `Tweet estratto correttamente!` });
	};
}
