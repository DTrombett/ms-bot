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
import { decodeHTML } from "entities";
import Command from "../Command.ts";
import { fetchCache } from "../util/fetchCache.ts";
import { escapeBaseMarkdown } from "../util/formatters.ts";
import { rest } from "../util/rest.ts";
import {
	findJSObjectAround,
	findJSONObjectAround,
} from "../util/stringParsing.ts";
import { template } from "../util/strings.ts";
import { TimeUnit } from "../util/time.ts";

export class Share extends Command {
	static override readonly supportComponentMethods = true;
	private static readonly USER_AGENT =
		"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
	private static readonly REAL_USER_AGENT =
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
	private static readonly TWITTER_REGEX =
		/^(\d+)$|^https?:\/\/(?:(?:www|m(?:obile)?)\.)?(?:(?:twitter|x)\.com|twitter3e4tixl4xyajtrzo62zg5vztmjuricljdp2c5kshju4avyoid\.onion)\/(?:(?:i\/web|[^/]+)\/status|statuses)\/(\d+)/;
	private static readonly TIKTOK_REGEX =
		/^(\d+)$|^https?:\/\/www\.tiktok\.com\/(?:embed|@(?:[\w.-]+)?\/(?:video|photo))\/(\d+)/;
	private static readonly TIKTOK_VM_REGEX =
		/^https?:\/\/(?:(?:vm|vt)\.tiktok\.com|(?:www\.)tiktok\.com\/t)\/\w+/;
	private static readonly INSTAGRAM_REGEX =
		/^https?:\/\/(?:www\.)?instagram\.com(?:\/(?!share\/)[^/?#]+)?\/(?:p|tv|reels?(?!\/audio\/))\/([^/?#&]+)/;
	static override chatInputData = {
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
				name: "instagram",
				description: "Condividi un post da Instagram",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "url",
						description: "Il link del post",
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
						description:
							"Se nascondere il numero di like e risposte (default: false)",
						type: ApplicationCommandOptionType.Boolean,
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static tiktok = async (
		{ defer, edit, reply }: ChatInputReplies,
		{
			options: { url, hide },
			interaction: { locale },
		}: ChatInputArgs<typeof Share.chatInputData, "tiktok">,
	) => {
		let response: Response;
		if (this.TIKTOK_VM_REGEX.test(url)) {
			response = await fetchCache(
				url,
				{ headers: { "User-Agent": this.USER_AGENT }, redirect: "manual" },
				TimeUnit.Year / TimeUnit.Second,
			);
			void response.body?.cancel();
			const location = response.headers.get("location");
			if (!location)
				return reply({
					flags: MessageFlags.Ephemeral,
					content:
						"Impossibile seguire il collegamento, prova a passare il link diretto al video",
				});
			url = location;
		}
		const id = url.match(this.TIKTOK_REGEX)?.findLast(Boolean);
		if (!id)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: `L'URL <${url}> non è valido!`,
			});
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });
		const input = new URL(
			`https://www.tiktok.com/player/v1/${id}?__loader=layout&__ssrDirect=true`,
		);
		const [browser_name, browser_version] = this.USER_AGENT.split(/\/(.+)/) as [
			string,
			string,
		];

		input.pathname = "/player/api/v1/items";
		input.search = new URLSearchParams({
			item_ids: id,
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
				BigInt(id) + BigInt(Math.round(Math.random() * Number.MAX_SAFE_INTEGER))
			).toString(),
		}).toString();
		response = await fetch(input, {
			headers: {
				"User-Agent": this.USER_AGENT,
				Referer: `https://www.tiktok.com/player/v1/${id}`,
				"agw-js-conv": "str",
			},
		});
		if (!response.ok) {
			void response.body?.cancel();
			return edit({
				content: `Impossibile scaricare i dati del video: ${response.status} ${response.statusText}`,
			});
		}
		const items = await response.json<TikTok.Items>().catch(console.error);

		if (!items?.items?.[0] || items.status_code !== 0)
			return edit({
				content: `Si è verificato un errore: \`${items?.status_msg.replaceAll("`", "\\`") || "Errore sconosciuto"}\``,
			});
		const [item] = items.items;
		await edit({
			flags: MessageFlags.IsComponentsV2,
			components: [
				{
					type: ComponentType.Section,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: `## [${item.author_info.nickname}](https://www.tiktok.com/@${item.author_info.unique_id})\n${item.desc}\n[Apri in TikTok](https://www.tiktok.com/@${escapeBaseMarkdown(item.author_info.unique_id)}/video/${id})`,
						},
					],
					accessory: {
						type: ComponentType.Thumbnail,
						media: { url: item.author_info.avatar_url_list[0]! },
					},
				},
				{
					type: ComponentType.MediaGallery,
					items: [
						item.video_info.meta.duration > 0 && {
							media: { url: item.video_info.url_list[0]! },
						},
						...(item.image_post_info?.images.map((m) => ({
							media: { url: m.display_image.url_list[0]! },
						})) ?? []),
					]
						.filter((a): a is Exclude<typeof a, Falsy> => Boolean(a))
						.slice(0, 8),
				},
				{
					type: ComponentType.TextDisplay,
					content: `-# ❤️ ${item.statistics_info.digg_count.toLocaleString(locale)}\t🔗 ${item.statistics_info.share_count.toLocaleString(locale)}\t🗨️ ${item.statistics_info.comment_count.toLocaleString(locale)}`,
				},
			],
			allowed_mentions: { parse: [] },
		});
	};
	static twitter = async (
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
		const tweetId = url.match(this.TWITTER_REGEX)?.findLast(Boolean);
		if (!tweetId)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "L'URL non è valido!",
			});
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });
		let response = await fetchCache(
			"https://x.com",
			{ headers: { "User-Agent": this.REAL_USER_AGENT } },
			(30 * TimeUnit.Minute) / TimeUnit.Second,
		);
		if (!response.ok) {
			void response.body?.cancel();
			return edit({
				content: `Impossibile scaricare la pagina: ${response.status} ${response.statusText}`,
			});
		}
		const guestId = response.headers
			.getSetCookie()
			.find((v) => v.startsWith("guest_id="))
			?.match(/^guest_id=([^;]+)/)?.[1];
		if (!guestId) {
			void response.body?.cancel();
			return edit({ content: "Impossibile ottenere il guest id" });
		}
		let body = await response.text();

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
		match = body.match(
			/<link\s+(?:[a-z0-9-.:_]+(?:=["'][^"']+["'])?\s+)*href=["']((?:|[^"']*\/)main(?:\.[^.]+)?\.js)["'][^>]*>/i,
		);
		if (!match?.[1])
			return edit({
				content: "Impossibile trovare il file JavaScript della pagina",
			});
		url = new URL(match[1], "https://x.com").href;

		body = await fetchCache(
			url,
			{ headers: { "User-Agent": this.REAL_USER_AGENT } },
			TimeUnit.Year / TimeUnit.Second,
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

		response = await fetch(
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
					Authorization: authorization,
					"User-Agent": this.REAL_USER_AGENT,
					"x-guest-token": gt,
					"x-twitter-active-user": "yes",
					"x-twitter-client-language": locale,
					Cookie: `guest_id=${guestId}; gt=${gt}`,
					"Content-Type": "application/json",
					Origin: "https://x.com",
				},
			},
		);
		if (!response.ok) {
			void response.body?.cancel();
			return edit({
				content: `Impossibile scaricare i dettagli del tweet: ${response.status} ${response.statusText}`,
			});
		}
		const json = await response.json<Twitter.TweetResultByRestId>();
		let {
			data: {
				tweetResult: { result: tweet },
			},
		} = json;

		if (!tweet) return edit({ content: "Tweet non trovato!" });
		if (tweet.__typename === "TweetTombstone")
			return edit({
				flags: MessageFlags.IsComponentsV2,
				components: await this.createTweetContentComponents(tweet),
				allowed_mentions: { parse: [] },
			});
		let retweeter: string | undefined;
		if (
			tweet.__typename === "Tweet" &&
			tweet.legacy.retweeted_status_result?.result
		) {
			retweeter = tweet.core.user_results.result.core.name;
			tweet = tweet.legacy.retweeted_status_result?.result;
		}
		let lastVersion: string | undefined;
		if (tweet.__typename === "TweetWithVisibilityResults") {
			tweet = { __typename: "Tweet", ...tweet.tweet };
			lastVersion = tweet.edit_control.edit_tweet_ids.at(-1);
			if (lastVersion === tweetId) lastVersion = undefined;
		}
		const components: APIMessageTopLevelComponent[] =
			await this.createTweetContentComponents(tweet, retweeter);
		if (tweet.quoted_status_result)
			components.push({
				type: ComponentType.Container,
				components: await this.createTweetContentComponents(
					tweet.quoted_status_result.result,
				),
			});
		components.push(
			{
				type: ComponentType.TextDisplay,
				content: template`
					-# ${[`<t:${Math.round(Date.parse(tweet.legacy.created_at) / 1000)}:f>`, tweet.views.count && `**${Number(tweet.views.count).toLocaleString(locale)}** visualizzazioni`].filter(Boolean).join(`\t·\t`)}
					-# 🗨️ ${tweet.legacy.reply_count.toLocaleString(locale)}\t🔃 ${(tweet.legacy.quote_count + tweet.legacy.retweet_count).toLocaleString(locale)}\t❤️ ${tweet.legacy.favorite_count.toLocaleString(locale)}\t🔖 ${tweet.legacy.bookmark_count.toLocaleString(locale)}
				`,
			},
			{
				type: ComponentType.ActionRow,
				components: this.createTweetButtons(tweet, hide, lastVersion),
			},
		);

		return edit({
			flags: MessageFlags.IsComponentsV2,
			components,
			allowed_mentions: { parse: [] },
		});
	};
	static "twitter-screenshot" = async (
		{ defer, reply }: ChatInputReplies,
		{
			options: {
				url,
				"hide-thread": hideThread = false,
				"hide-stats": hideStats = false,
				theme = "dark",
			},
			fullRoute,
		}: ChatInputArgs<typeof Share.chatInputData, "twitter-screenshot">,
	) => {
		const tweetId = url.match(this.TWITTER_REGEX)?.findLast(Boolean);
		if (!tweetId)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "L'URL non è valido!",
			});
		defer();
		const browser = await launch(env.BROWSER);
		try {
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
				page
					.getByRole("link", { name: /^Show more$/ })
					.last()
					.evaluateAll(
						(elements: { textContent: string }[]) =>
							elements[0] && (elements[0].textContent = "..."),
					),
			]);

			return rest.patch(fullRoute, {
				body: {
					attachments: [{ id: 0, filename: `${tweetId}.png` }],
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
						name: `${tweetId}.png`,
						contentType: "image/png",
					},
				],
			});
		} finally {
			await browser.close();
		}
	};
	static instagram = async (
		{ defer, edit, reply }: ChatInputReplies,
		{
			options: { url, hide },
			interaction: { locale },
		}: ChatInputArgs<typeof Share.chatInputData, "instagram">,
	) => {
		const id = url.match(this.INSTAGRAM_REGEX)?.findLast(Boolean);
		if (!id)
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "L'URL non è valido!",
			});
		url = `https://www.instagram.com/p/${id}`;
		defer({ flags: hide ? MessageFlags.Ephemeral : undefined });
		const response = await fetch(url, {
			headers: {
				"Accept-Language": locale,
				"User-Agent": this.REAL_USER_AGENT,
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
				Priority: "u=0, i",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-User": "?1",
			},
		});

		if (!response.ok) {
			void response.body?.cancel();
			return edit({
				content: `Impossibile scaricare la pagina Instagram: ${response.status} ${response.statusText}`,
			});
		}
		const html = await response.text();
		const index = html.match(
			new RegExp(`\\{[^<{}]*?"code":\\s*"${id}"`, "u"),
		)?.index;
		if (!index)
			return edit({
				content:
					"Impossibile estrarre i contenuti dalla pagina! Assicurati che il post sia visibile nel browser senza effettuare il login.",
			});
		const item = findJSONObjectAround<Instagram.Item>(html, index, 0);
		await edit({
			flags: MessageFlags.IsComponentsV2,
			components: [
				...[
					item.clips_metadata?.original_sound_info ?
						({
							type: ComponentType.TextDisplay,
							content: template`
								### [${item.clips_metadata.original_sound_info.ig_artist.username}](https://www.instagram.com/${item.clips_metadata.original_sound_info.ig_artist.username})
								${1}${item.clips_metadata.original_sound_info.original_audio_title}
							`,
						} as const)
					: item.clips_metadata?.music_info?.music_asset_info.title ?
						({
							type: ComponentType.TextDisplay,
							content: template`
								### [${item.user.username}](https://www.instagram.com/${item.user.username})
								${1}${item.clips_metadata?.music_info?.music_asset_info.display_artist} • ${item.clips_metadata?.music_info?.music_asset_info.title}
							`,
						} as const)
					: item.location ?
						({
							type: ComponentType.TextDisplay,
							content: template`
								### [${item.user.username}](https://www.instagram.com/${item.user.username})
								${1}${item.location.name}
							`,
						} as const)
					:	null,
				].filter((a) => a != null),
				{
					type: ComponentType.Section,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: template`
								## [${item.user.full_name && `${item.user.full_name} @`}${item.user.username}](https://www.instagram.com/${item.user.username})
								${item.caption}${item.caption?.text}
								${item.is_paid_partnership}-# Contenuto sponsorizzato
								[Apri in Instagram](${url})
							`,
						},
					],
					accessory: {
						type: ComponentType.Thumbnail,
						media: {
							url:
								item.user.hd_profile_pic_url_info?.url ??
								item.user.profile_pic_url,
						},
					},
				},
				{
					type: ComponentType.MediaGallery,
					items: (item.carousel_media ?? [item])
						.slice(0, 8)
						.map((item) => ({
							media: {
								url:
									item.video_versions?.[0]?.url ??
									item.image_versions2.candidates[0]?.url ??
									item.display_uri,
							},
							description:
								[
									item.accessibility_caption,
									item.usertags?.in &&
										`Tags: ${item.usertags?.in
											.map(
												(t) =>
													`${t.user.full_name && `${t.user.full_name} @`}${t.user.username}`,
											)
											.join(", ")}`,
								]
									.filter(Boolean)
									.join("\n") || undefined,
						})),
				},
				{
					type: ComponentType.TextDisplay,
					content: `-# ❤️ ${(item.like_count ?? 0).toLocaleString(locale)}\t🗨️ ${item.comment_count.toLocaleString(locale)}\t•\t<t:${item.taken_at}:f>`,
				},
			],
			allowed_mentions: { parse: [] },
		});
	};
	private static getFullTweet = (
		tweet: Twitter.Tweet | Twitter.TweetTombstone,
	) => {
		const entitySet: Partial<Twitter.Entities> & {
			text?: Twitter.TextEntity[];
		} =
			tweet.__typename === "Tweet" ?
				(tweet.note_tweet?.note_tweet_results.result.entity_set ??
				tweet.legacy.entities)
			:	{ text: tweet.tombstone.text.entities };
		const text = Array.from(
			tweet.__typename === "Tweet" ?
				(tweet.note_tweet?.note_tweet_results.result.text ??
					tweet.legacy.full_text)
			:	tweet.tombstone.text.text,
		);
		const entities: {
			indices: readonly [number, number];
			data: string;
			replace?: boolean;
		}[] = [
			...(entitySet.user_mentions?.map(
				(e) =>
					({
						indices: e.indices,
						data: `https://twitter.com/${e.screen_name}`,
					}) as const,
			) ?? []),
			...(entitySet.hashtags?.map(
				(e) =>
					({
						indices: e.indices,
						data: `https://twitter.com/hashtag/${e.text}`,
					}) as const,
			) ?? []),
			...(entitySet.text?.map(
				(u) =>
					({ indices: [u.fromIndex, u.toIndex], data: u.ref.url }) as const,
			) ?? []),
			...(entitySet.urls?.map(
				(u) =>
					({
						indices: u.indices,
						data: u.expanded_url,
						replace: true,
					}) as const,
			) ?? []),
		];

		return decodeHTML(
			entities
				.sort((a, b) => a.indices[0] - b.indices[0])
				.reduce(
					(fullText, mention, i) =>
						`${fullText}${
							mention.replace ?
								escapeBaseMarkdown(mention.data)
							:	`[${text.slice(...mention.indices).join("")}](${escapeBaseMarkdown(
									mention.data,
								)})`
						}${text.slice(mention.indices[1], entities[i + 1]?.indices[0]).join("")}`,
					text.slice(0, entities[0]?.indices[0]).join(""),
				),
		);
	};
	private static createTweetButtons = (
		tweet: Twitter.Tweet,
		hide = false,
		lastVersion?: string,
	) => {
		const buttons: APIButtonComponent[] = [
			{
				type: ComponentType.Button,
				style: ButtonStyle.Link,
				url: `https://twitter.com/i/status/${tweet.rest_id}`,
				label: "Apri in Twitter",
			},
		];
		const match = tweet.source.match(
			/<a\s+[^>]*href\s*=\s*["'](https?:\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}(?:\/[^"']+)?)["'][^>]*>([^<]+)<\/a>/,
		);

		if (lastVersion)
			buttons.push({
				type: ComponentType.Button,
				style: ButtonStyle.Secondary,
				label: "Visualizza il post più recente",
				custom_id: `share-twitter-${lastVersion}-${hide ? "1" : ""}`,
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
		if (match && match[1] && match[2])
			buttons.push({
				type: ComponentType.Button,
				style: ButtonStyle.Link,
				url: match[1],
				label: match[2],
			});
		return buttons;
	};
	private static async createTweetContentComponents(
		tweet: Twitter.Tweet | Twitter.TweetTombstone,
		retweeter?: string,
	): Promise<APIComponentInContainer[]> {
		const user =
			tweet.__typename === "Tweet" ?
				tweet.core.user_results.result
			:	tweet.tombstone.user_results.result;
		const components: APIComponentInContainer[] = [
			{
				type: ComponentType.Section,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: template`
							## [${user.core.name} @${user.core.screen_name}](https://twitter.com/${user.core.screen_name})
							${true}${this.getFullTweet(tweet)}
							${retweeter}-# \\🔃 Repost di ${retweeter}
						`,
					},
				],
				accessory: {
					type: ComponentType.Thumbnail,
					media: {
						url: user.avatar.image_url.replace(/_[^_.-/?#]+?\.(\w+)$/, ".$1"),
					},
				},
			},
		];
		const media:
			| (Partial<Twitter.Media> & Pick<Twitter.Media, "media_url_https">)[]
			| undefined =
			tweet.__typename === "Tweet" ?
				(tweet.note_tweet?.note_tweet_results.result.entity_set.media ??
				tweet.legacy.entities.media ??
				[])
			:	[{ media_url_https: tweet.tombstone.blurred_image_url }];

		if (tweet.__typename === "Tweet" && tweet.card)
			media.push(
				...(await Promise.try(() =>
					Object.values(
						(
							JSON.parse(
								tweet.card!.legacy.binding_values.find(
									(b) => b.key === "unified_card",
								)?.value.string_value ?? JSON.stringify({ media_entities: [] }),
							) as Twitter.TweetCard
						).media_entities,
					),
				).catch((err) => {
					console.error(err, tweet.card?.legacy.binding_values);
					return [];
				})),
			);
		if (media.length)
			components.push({
				type: ComponentType.MediaGallery,
				items: media
					.slice(0, 8)
					.map((m) => ({
						media: {
							url:
								m.video_info?.variants
									.filter(
										(a) =>
											a.content_type.startsWith("video/") &&
											(!a.bitrate ||
												(a.bitrate * m.video_info!.duration_millis) /
													TimeUnit.Second <=
													500 * 1024 * 1024),
									)
									.reduce<Twitter.Variant | null>(
										(a, b) =>
											a?.bitrate && a.bitrate > (b.bitrate ?? 0) ? a : b,
										null,
									)?.url ?? m.media_url_https,
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
