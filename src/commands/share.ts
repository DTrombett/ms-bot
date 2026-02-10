import { devices, launch } from "@cloudflare/playwright";
import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIButtonComponent,
	type APIComponentInContainer,
	type APIMessageTopLevelComponent,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { fetchCache } from "../util/fetchCache.ts";
import { rest } from "../util/rest.ts";
import { findJSObjectAround } from "../util/stringParsing.ts";
import { template } from "../util/strings.ts";
import { TimeUnit } from "../util/time.ts";

export class Share extends Command {
	static override readonly "supportComponentMethods" = true;
	private static readonly "USER_AGENT" =
		"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
	private static readonly "REAL_USER_AGENT" =
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
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
			{
				name: "twitter-screenshot",
				description: "Crea uno screenshot di un tweet (X)",
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
					},
					{
						name: "theme",
						description: "Se usare il tema scuro o chiaro (default: scuro)",
						type: ApplicationCommandOptionType.String,
						choices: [
							{ name: "Chiaro", value: "light" },
							{ name: "Scuro", value: "dark" },
						],
					},
					{
						name: "hide-thread",
						description:
							"Se nascondere il messaggio precedente (default: false)",
						type: ApplicationCommandOptionType.Boolean,
					},
					{
						name: "hide-stats",
						description: "Se nascondere i like e le risposte (default: false)",
						type: ApplicationCommandOptionType.Boolean,
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
	static "twitter" = async (
		{ defer, edit, reply }: Merge<ChatInputReplies, ComponentReplies>,
		{
			args: [u = "", h = ""] = [],
			options: { url, hide } = { url: u, hide: Boolean(h) },
			interaction: { locale },
		}: Merge<
			ChatInputArgs<typeof Share.chatInputData, "twitter">,
			ComponentArgs
		>,
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

		if (
			![
				"x.com",
				"www.x.com",
				"twitter.com",
				"www.twitter.com",
				"t.co",
			].includes(parsed.host)
		)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "L'URL non è valido!",
			});
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });

		let response = await fetchCache(parsed, {
			headers: {
				"accept-language": locale,
				"User-Agent": this.REAL_USER_AGENT,
			},
		});
		if (!response.ok) {
			void response.body?.cancel();
			return edit({
				content: `Impossibile scaricare la pagina: ${response.status} ${response.statusText}`,
			});
		}
		({ url } = response);
		parsed.href = url;
		const tweetId = parsed.pathname.split("/").at(-1)!;
		if (!idRegex.test(tweetId)) {
			void response.body?.cancel();
			return edit({ content: "L'URL della pagina non è valido!" });
		}
		const guestId = response.headers
			.getSetCookie()
			.find((v) => v.startsWith("guest_id="))
			?.match(/^guest_id=([^;]+)/)?.[1];
		if (!guestId) {
			void response.body?.cancel();
			return edit({ content: "Impossibile ottenere il guest id" });
		}
		let body = `${await response.text()}</body></html>`;

		const { resolve, reject, promise } = Promise.withResolvers<string>();
		new HTMLRewriter()
			.on('link[href*="/main."]', {
				element: (element) =>
					resolve(new URL(element.getAttribute("href")!, url).href),
			})
			.onDocument({ end: reject })
			.transform(new Response(body));
		let match = body.match(/featureSwitch["']?\s*:\s*{/);
		if (!match)
			return edit({ content: "Impossibile trovare i dettagli della query" });
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
			return edit({ content: "Impossibile ottenere il guest token" });
		const gt = match[1];
		if (!(url = await promise.catch(() => "")))
			return edit({
				content: "Impossibile trovare il file JavaScript della pagina",
			});

		body = await fetchCache(
			url,
			{
				headers: {
					"accept-language": locale,
					"User-Agent": this.REAL_USER_AGENT,
				},
			},
			TimeUnit.Day / TimeUnit.Second,
		).then((res) => res.text());
		const authorization = body.match(/Bearer \w[^"']+/)?.[0];
		if (!authorization)
			return edit({
				content: "Impossibile ottenere il token di autorizzazione",
			});
		const trbri = findJSObjectAround<{
			queryId: string;
			operationName: string;
			operationType: string;
			metadata: { featureSwitches: string[]; fieldToggles: string[] };
		}>(body, body.indexOf('"TweetResultByRestId"'));

		response = await fetchCache(
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
					"Accept-Language": locale,
					"Authorization": authorization,
					"User-Agent": this.REAL_USER_AGENT,
					"x-guest-token": gt,
					"x-twitter-active-user": "yes",
					"x-twitter-client-language": locale,
					"Cookie": `guest_id=${guestId}; gt=${gt}`,
					"Content-Type": "application/json",
					"Origin": "https://x.com",
				},
				method: "GET",
			},
		);
		if (!response.ok) {
			void response.body?.cancel();
			return edit({
				content: `Impossibile scaricare i dettagli del tweet: ${response.status} ${response.statusText}`,
			});
		}
		const {
			data: {
				tweetResult: { result: tweet },
			},
		} = await response.json<Twitter.TweetResultByRestId>();

		const components: APIMessageTopLevelComponent[] =
			this.createTweetContentComponents(tweet);
		if (tweet.quoted_status_result)
			components.push({
				type: ComponentType.Container,
				components: this.createTweetContentComponents(
					tweet.quoted_status_result.result,
				),
			});
		components.push(
			{
				type: ComponentType.TextDisplay,
				content: template`
					-# <t:${Math.round(Date.parse(tweet.legacy.created_at) / 1000)}:f>\t·\t**${Number(tweet.views.count).toLocaleString(locale)}** visualizzazioni
					-# 🗨️ ${tweet.legacy.reply_count.toLocaleString(locale)}\t🔃 ${(tweet.legacy.quote_count + tweet.legacy.retweet_count).toLocaleString(locale)}\t❤️ ${tweet.legacy.favorite_count.toLocaleString(locale)}\t🔖 ${tweet.legacy.bookmark_count.toLocaleString(locale)}
				`,
			},
			{
				type: ComponentType.ActionRow,
				components: this.twitterCreateButtons(tweet, hide),
			},
		);

		return edit({
			flags: MessageFlags.IsComponentsV2,
			components,
			allowed_mentions: { parse: [] },
		}).catch(console.error);
	};
	static "twitter-screenshot" = async (
		{ defer, reply }: Merge<ChatInputReplies, ComponentReplies>,
		{
			args: [u = "", h = ""] = [],
			options: {
				url,
				hide,
				"hide-thread": hideThread = false,
				"hide-stats": hideStats = false,
				theme = "dark",
			} = {
				"url": u,
				"hide": Boolean(h),
				"hide-thread": false,
				"hide-stats": false,
				"theme": "dark",
			},
			fullRoute,
		}: Merge<
			ChatInputArgs<typeof Share.chatInputData, "twitter-screenshot">,
			ComponentArgs
		>,
	) => {
		const tweetId = url.match(/(?<=^|\/status\/)\d+/)?.[0];
		if (!tweetId)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "L'URL non è valido!",
			});
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });
		const browser = await launch(env.BROWSER);
		const page = await browser.newPage({
			baseURL: "https://platform.twitter.com/embed/",
			...devices["Desktop Chrome HiDPI"],
			deviceScaleFactor: 4,
			viewport: { width: 7680, height: 4320 },
			screen: { width: 7680, height: 4320 },
		});
		const hasText = /^Read (?:(\d+) repl(?:ies|y)|more on (?:X|Twitter))$/;
		const readReplies = page.locator("div", { hasText }).nth(-2);

		page.setDefaultTimeout(20_000);
		await page.goto(
			`Tweet.html?${new URLSearchParams({
				dnt: "true",
				id: tweetId,
				theme,
				hideThread: String(hideThread),
			}).toString()}`,
		);
		await Promise.all([
			page
				.getByText("Reply", { exact: true })
				.last()
				.evaluate(
					(el: { textContent: string }, replies: number) =>
						(el.textContent = String(replies)),
					Number((await readReplies.innerText()).match(hasText)?.[1]) || 0,
				),
			readReplies
				.or(page.locator("div[aria-hidden='true']", { hasText: /^·$/ }))
				.or(page.getByRole("link", { name: "Follow", exact: true }))
				.or(page.getByRole("button", { name: /^Copy link to post$/ }).last())
				.evaluateAll((elements: { remove: () => void }[]) =>
					(elements.length > 5 ? elements.slice(1) : elements).forEach((el) =>
						el.remove(),
					),
				),
		]);

		return Promise.all([
			rest
				.patch(fullRoute, {
					body: {
						attachments: [{ id: 0, filename: "screenshot.png" }],
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
					files: [
						{
							data: await page
								.getByRole("article")
								.first()
								.screenshot({
									omitBackground: true,
									style: `
										a[aria-label='X Ads info and privacy'] { visibility: hidden; }
										a[aria-label='Watch on X'] { display: none; }
										div:has(> a[href^='https://twitter.com/intent/tweet']) {
											${hideStats ? "display: none" : "justify-content: space-evenly"};
										}
									`,
								}),
							name: "screenshot.png",
							contentType: "image/png",
						},
					],
				})
				.catch(console.error),
			browser.close(),
		]);
	};
	private static "twitterGetFullText" = (tweet: Twitter.Tweet) => {
		const entitySet =
			tweet.note_tweet?.note_tweet_results.result.entity_set ??
			tweet.legacy.entities;
		const text =
			tweet.note_tweet?.note_tweet_results.result.text ??
			tweet.legacy.full_text;
		const entities = entitySet.user_mentions
			.map((e) => ({
				type: "userMention",
				indices: e.indices,
				data: e.screen_name,
			}))
			.concat(
				entitySet.hashtags.map((e) => ({
					type: "hashtag",
					indices: e.indices,
					data: e.text,
				})),
			)
			.sort((a, b) => a.indices[0] - b.indices[0]);

		return entities.reduce(
			(fullText, mention, i) =>
				`${fullText}[${text.slice(...mention.indices)}](${
					mention.type === "userMention" ? `https://twitter.com/${mention.data}`
					: mention.type === "hashtag" ?
						`https://twitter.com/hashtag/${mention.data}`
					:	""
				})${text.slice(mention.indices[1], entities[i + 1]?.indices[0])}`,
			text.slice(0, entities[0]?.indices[0]),
		);
	};
	private static "twitterCreateButtons" = (
		tweet: Twitter.Tweet,
		hide = false,
	) => {
		const buttons: APIButtonComponent[] = [];
		const match = tweet.source.match(
			/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]+)<\/a>/,
		);

		if (match && match[1] && match[2])
			buttons.push({
				type: ComponentType.Button,
				style: ButtonStyle.Link,
				url: match[1],
				label: match[2],
			});
		if (tweet.legacy.in_reply_to_status_id_str)
			buttons.push({
				type: ComponentType.Button,
				style: ButtonStyle.Secondary,
				label: "Vedi tweet precedente",
				custom_id: `share-twitter-${tweet.legacy.in_reply_to_status_id_str}-${hide ? "1" : ""}`,
			});
		if (tweet.quoted_status_result?.result.rest_id)
			buttons.push({
				type: ComponentType.Button,
				style: ButtonStyle.Secondary,
				label: "Vedi tweet citato",
				custom_id: `share-twitter-${tweet.quoted_status_result?.result.rest_id}-${hide ? "1" : ""}`,
			});
		buttons.push({
			type: ComponentType.Button,
			style: ButtonStyle.Link,
			url: `https://twitter.com/i/status/${tweet.rest_id}`,
			label: "Apri in Twitter",
		});
		return buttons;
	};
	private static "createTweetContentComponents"(
		tweet: Twitter.Tweet,
	): APIComponentInContainer[] {
		const components: APIComponentInContainer[] = [
			{
				type: ComponentType.Section,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `## [${tweet.core.user_results.result.core.name} @${tweet.core.user_results.result.core.screen_name}](https://twitter.com/${tweet.core.user_results.result.core.screen_name})\n${this.twitterGetFullText(tweet)}`,
					},
				],
				accessory: {
					type: ComponentType.Thumbnail,
					media: { url: tweet.core.user_results.result.avatar.image_url },
				},
			},
		];
		const media = (
			tweet.note_tweet?.note_tweet_results.result.entity_set ??
			tweet.legacy.entities
		).media;

		if (media?.length)
			components.push({
				type: ComponentType.MediaGallery,
				items: media.map((m) => ({
					media: {
						url:
							m.video_info?.variants
								.filter((a) => a.content_type.startsWith("video/"))
								.reduce((a, b) =>
									a.bitrate && a.bitrate > (b.bitrate ?? 0) ? a : b,
								).url ?? m.media_url_https,
					},
					description:
						[
							m.ext_alt_text,
							m.additional_media_info?.source_user?.user_results.result.core
								.name &&
								`Di ${m.additional_media_info?.source_user?.user_results.result.core.name}`,
						]
							.filter(Boolean)
							.join("\n") || undefined,
				})),
			});

		return components;
	}
}
