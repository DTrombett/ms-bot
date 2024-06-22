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
			(v) =>
				Date.parse(
					// v.sys.creationTime,
					v.timestamp,
				) +
					61_000 >=
				now,
		);

		if (posts.length)
			await rest.post(Routes.channelMessages(env.LIVE_CHANNEL), {
				body: {
					embeds: posts.reverse().map((p) => {
						const creator = p.attributes.creator.split(":").at(-1)!;
						const node =
							p.attributes.nodes && Object.values(p.attributes.nodes)[0];
						const img = node
							? node.files["content.json"].data.document._elements
									.mediagroup?.[0]?.figure[0]?.img[0]?.src
							: p.attributes["content.json"].data.article._elements.find(
									(a) => a.figure?.length,
								)?.figure![0]!.img[0]?.src;
						const description = p.attributes[
							"content.json"
						].data.article._elements
							.map((a) =>
								a._type === "SOCIAL"
									? a._attributes?.["emk-posturl"]
									: a._type === "EXTRA" &&
										  a._attributes?.["emk-type"] === "standings"
										? "[View live standings](https://uefa.com/euro2024/standings)"
										: a._html,
							)
							.filter((a) => a)
							.join("\n")
							.replace(/<p>|<\/p>|<b><\/b>|<u><\/u>|<\/b><b>|<\/u><u>/g, "")
							.replace(/<b>|<\/b>/g, "**")
							.replace(/<u>|<\/u>/g, "__")
							.replaceAll("<br/>", "\n");

						return new EmbedBuilder()
							.setTitle(
								p.attributes.liveblogPostData.lbPostFSPEvent.eventType &&
									p.attributes.liveblogPostData.lbPostFSPEvent.eventType in
										titles
									? titles[
											p.attributes.liveblogPostData.lbPostFSPEvent.eventType
										]!(p.attributes.liveblogPostData.lbPostFSPEvent)
									: node
										? node.title
										: creator === "integrations.liveblog"
											? null
											: creator.replace(".", " "),
							)
							.setAuthor({
								name: `${p.attributes.liveblogPostData.lbPostEvent.eventDisplayMinute ?? ""} ${match.homeTeam.internationalName} ${match.score!.total.home} - ${match.score!.total.away} ${match.awayTeam.internationalName}`,
							})
							.setDescription(
								(p.attributes.liveblogPostData.lbPostType === "MATCH_EVENT"
									? p.attributes.liveblogPostData.lbPostFSPEvent
											.eventTranslation ?? ""
									: node
										? node.description
										: description) || null,
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
									: 0x2b2d31,
							)
							.toJSON();
					}),
				} satisfies RESTPostAPIChannelMessageJSONBody,
			});
	};
