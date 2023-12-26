import { Feed, parseFeed } from "htmlparser2";
import { Document, RSS, RSSSchema } from "../models";
import formatBytes from "./formatBytes";

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

			if (!channel) return;
			const rss = parseFeed(feedText, { xmlMode: true });

			if (!rss) {
				if (feed.errorsCount === 9) {
					await Promise.all([
						channel.send(
							`Il feed [${feed.title ?? "Feed sconosciuto"}](<${
								feed.link
							}>) è stato automaticamente eliminato in quanto ha ricevuto troppi errori consecutivi. Se il problema con il feed è stato risolto, è possibile aggiungerlo nuovamente tramite il comando \`/rss add\`.`,
						),
						feed.deleteOne(),
					]).catch(printToStderr);
					return;
				}
				feed.errorsCount++;
				await Promise.all([
					feed.errorsCount === 6 &&
						channel.send(
							`È stato impostato il feed [${
								feed.title ?? "Feed sconosciuto"
							}](<${
								feed.link
							}>) in questo canale ma ha ricevuto più di 5 errori consecutivi. Questo indica che probabilmente il feed non è più valido o non è più attivo. Se verranno rilevati altri errori, verrà automaticamente disattivato.`,
						),
					feed.save(),
				]).catch(printToStderr);
				return;
			}
			feed.errorsCount = 0;
			if (rss.updated && feed.lastUpdate >= rss.updated.getTime()) return;
			rss.items = rss.items.filter(
				(item) => item.pubDate && item.pubDate.getTime() > feed.lastUpdate,
			);
			if (!rss.items.length) return;
			feed.lastUpdate = Date.now();
			await Promise.all([
				channel.send(createFeedMessageOptions(rss)),
				feed.save(),
			]).catch(printToStderr);
		});
};

export const loadFeeds = async (client: CustomClient) => {
	feeds.clear();
	for (const feed of await RSS.find({})) feeds.set(feed.id, feed);
	setFeedsInterval(client).catch(printToStderr);
};

export const createFeed = async (
	schema: Omit<RSSSchema, "errorsCount" | "lastUpdate"> & Partial<RSSSchema>,
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
