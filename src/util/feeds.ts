import {
	Collection,
	Colors,
	EmbedBuilder,
	GuildTextBasedChannel,
} from "discord.js";
import { Feed, parseFeed } from "htmlparser2";
import { setInterval } from "node:timers/promises";
import { request } from "undici";
import { Document, RSS, RSSSchema } from "../models";
import CustomClient from "./CustomClient";
import formatBytes from "./formatBytes";
import { printToStderr } from "./logger";

export const feeds = new Collection<string, Document<RSSSchema>>();

export const createFeedMessageOptions = (rss: Feed) => ({
	embeds: rss.items.slice(0, 10).map((item) => {
		const embed = new EmbedBuilder()
			.setTitle(item.title ?? "Aggiornamento dal feed")
			.setURL(item.link ?? null)
			.setDescription(
				item.description?.slice(0, 1000) ??
					"È stato postato un aggiornamento al feed che stai seguendo!",
			)
			.setFooter({ text: "Pubblicato" })
			.setTimestamp(item.pubDate)
			.setAuthor({
				name: rss.title ?? "Feed RSS",
				url: rss.link,
			})
			.setColor(Colors.Orange);
		const media = item.media.filter(
			(m): m is typeof m & { url: string } => m.url != null,
		);

		if (media.length) {
			const images = media.filter((m) => m.medium === "image");

			if (images.length)
				embed.setImage(
					(images.length === 1
						? images[0]
						: images.find((m) => m.isDefault) ?? images[0]
					).url,
				);
			embed.addFields({
				name: "Allegati",
				value: media
					.map(
						(m) =>
							`[${m.medium}${
								m.fileSize == null ? "" : ` (${formatBytes(m.fileSize)})`
							}](${m.url})`,
					)
					.join(", "),
			});
		}
		return embed;
	}),
});

const setFeedsInterval = async (client: CustomClient) => {
	for await (const _ of setInterval(1_000 * 60 * 10))
		feeds.map(async (feed) => {
			const [feedText, channel] = await Promise.all([
				request(feed.link, {
					bodyTimeout: 10000,
					headersTimeout: 10000,
				}).then((res) => res.body.text()),
				client.channels.fetch(
					feed.channel,
				) as Promise<GuildTextBasedChannel | null>,
			]).catch(() => ["", null] as const);
			const rss = parseFeed(feedText, { xmlMode: true });

			if (!rss || (rss.updated && feed.lastUpdate >= rss.updated.getTime()))
				return;
			const items = rss.items.filter(
				(item) => item.pubDate && item.pubDate.getTime() > feed.lastUpdate,
			);

			if (!items.length) return;
			if (!channel) return;
			const now = Date.now();

			await channel.send(createFeedMessageOptions(rss)).catch(printToStderr);
			feed.lastUpdate = now;
			await feed.save();
		});
};

export const loadFeeds = async (client: CustomClient) => {
	feeds.clear();
	for (const feed of await RSS.find({})) feeds.set(feed.id, feed);
	setFeedsInterval(client).catch(printToStderr);
};

export const createFeed = async (
	schema: Omit<RSSSchema, "lastUpdate"> & Partial<RSSSchema>,
) => {
	const doc = new RSS(schema);

	doc.lastUpdate = Date.now();
	feeds.set(doc.id, doc);
	return doc.save();
};

export const deleteFeed = async (id: string) => {
	await feeds.get(id)?.deleteOne();
	return feeds.delete(id);
};
