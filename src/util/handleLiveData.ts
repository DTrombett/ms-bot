import { EmbedBuilder } from "@discordjs/builders";
import {
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { findOne } from "domutils";
import { parseDocument } from "htmlparser2";
import { rest } from "./rest";
import type { Env, MatchData, PostsData } from "./types";

const titles: Record<
	string,
	(
		event: PostsData["result"][number]["attributes"]["liveblogPostData"]["lbPostFSPEvent"],
	) => string
> = {
	YELLOW_CARD: () => ":yellow_square: Yellow card",
	VAR: (event) =>
		event.varInfo?.status === "OFFICIAL_REVIEW"
			? "🟠 VAR Review"
			: event.varInfo?.status === "CHANGED" && event.varInfo.result !== "NONE"
				? "🟢 VAR Review Complete"
				: "⚪ VAR",
	INJURY_TIME: (event) => `⌚ +${event.eventStrTime}`,
	SUBSTITUTION: () => "🔃 Substitution",
	GOAL: () => "⚽ Gooooal!",
	OFFSIDE: () => `🚩 Offside`,
	END_PHASE: () => `⌚ Half time`,
	START_PHASE: () => `⌚ Half time end`,
};
const colors: Record<
	string,
	(
		event: PostsData["result"][number]["attributes"]["liveblogPostData"]["lbPostFSPEvent"],
	) => number
> = {
	YELLOW_CARD: () => 0xfee75c,
	VAR: (event) =>
		event.varInfo?.status === "OFFICIAL_REVIEW"
			? 0xe67e22
			: event.varInfo?.status === "CHANGED" && event.varInfo.result !== "NONE"
				? 0x57f287
				: 0xffffff,
	INJURY_TIME: () => 0xf1c40f,
	SUBSTITUTION: () => 10656358,
	GOAL: () => 0x5865f2,
	OFFSIDE: () => 0xed4245,
	END_PHASE: () => 0x5865f2,
};

export const handleLiveData =
	(env: Env, match: MatchData, now: number) => async (text: string) => {
		const doc = parseDocument(text);
		let found: { blogId: string } | undefined;

		findOne(
			(a) =>
				a.attributes.find(
					(n) =>
						n.name === "data-options" &&
						n.value !== "null" &&
						"blogId" in (found = JSON.parse(n.value)),
				) !== undefined,
			doc.childNodes,
			true,
		);
		if (typeof found?.blogId !== "string") return;
		const posts = (
			(await fetch(
				`https://editorial.uefa.com/api/liveblogs/${found.blogId}/posts?aggregator=lightliveblogjson&limit=10`,
			).then((res) => res.json())) as PostsData
		).result.filter(
			(p) =>
				Date.parse(p.timestamp) + 61_000 >= now &&
				p.attributes.liveblogPostData.lbPostType === "MATCH_EVENT",
		);

		if (posts.length)
			await rest.post(Routes.channelMessages(env.LIVE_CHANNEL), {
				body: {
					embeds: posts.reverse().map((p) => {
						const node =
							p.attributes.nodes && Object.values(p.attributes.nodes)[0];
						const img = node
							? node.files["content.json"].data.document._elements
									.mediagroup?.[0]?.figure[0]?.img[0]?.src
							: p.attributes["content.json"].data.article._elements.find(
									(a) => a.figure?.length,
								)?.figure![0]!.img[0]?.src;

						return new EmbedBuilder()
							.setTitle(
								titles[
									p.attributes.liveblogPostData.lbPostFSPEvent.eventType!
								]?.(p.attributes.liveblogPostData.lbPostFSPEvent) ?? null,
							)
							.setAuthor({
								name: `${p.attributes.liveblogPostData.lbPostEvent.eventDisplayMinute ?? ""} ${match.homeTeam.internationalName} ${match.score!.total.home} - ${match.score!.total.away} ${match.awayTeam.internationalName}`,
							})
							.setDescription(
								p.attributes.liveblogPostData.lbPostFSPEvent
									.eventTranslation! || null,
							)
							.setImage(img ? `https://editorial.uefa.com${img}` : null)
							.setURL(
								node ? `https://uefa.com${node.attributes.webReference}` : null,
							)
							.setTimestamp(new Date(p.timestamp))
							.setColor(
								p.attributes.liveblogPostData.lbPostFSPEvent.eventType &&
									p.attributes.liveblogPostData.lbPostFSPEvent.eventType in
										colors
									? colors[
											p.attributes.liveblogPostData.lbPostFSPEvent.eventType
										]!(p.attributes.liveblogPostData.lbPostFSPEvent)
									: null,
							)
							.toJSON();
					}),
				} satisfies RESTPostAPIChannelMessageJSONBody,
			});
	};
