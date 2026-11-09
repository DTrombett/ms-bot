import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command";
import { fetchCache } from "../util/fetchCache";
import { rest } from "../util/globals";
import { findJSONObjectAround } from "../util/stringParsing";

type TextSettings = {
	x: number;
	y: number;
	w: number;
	h: number;
	rotation: number;
	font: string;
	font_color: string;
	outline_color: string;
	outline_width?: number;
	force_caps: boolean;
	text_align: string;
	vertical_align: string;
	font_max_size?: number;
};
type ResolvedText = {
	width: number;
	height: number;
	text: string;
	size: number;
};
type Meme = {
	id: number;
	uid: number;
	name: string;
	w: number;
	h: number;
	file_type: string;
	url_name: string;
	altNames: string;
	safe_for_work: string;
	default_settings: string;
	has_transparency: 0 | 1;
	private: 0 | 1;
};

enum SearchScore {
	NoMatch,
	PartialAltMatch,
	PartialNameMatch,
	PartialAltMatchStart,
	PartialNameMatchStart,
	FullAltMatch,
	FullURLMatch,
	FullNameMatch,
	FullIDMatch,
}

export class Meme extends Command {
	private static readonly FONTS = ["arial", "impact"];
	static override chatInputData = {
		name: "meme",
		description: "Crea un meme a partire da un'immagine",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "template",
				description: "Il template da usare",
				type: ApplicationCommandOptionType.String,
				required: true,
				autocomplete: true,
			},
			{
				name: "text1",
				description: "Il primo testo da inserire",
				type: ApplicationCommandOptionType.String,
				required: true,
			},
			{
				name: "text2",
				description: "Il secondo testo da inserire",
				type: ApplicationCommandOptionType.String,
			},
			{
				name: "text3",
				description: "Il terzo testo da inserire",
				type: ApplicationCommandOptionType.String,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

	private static loadMemes = async () => {
		const res = await fetchCache(
			"https://imgflip.com/memegenerator",
			{},
			86400,
		);
		if (!res.ok)
			return console.error(
				"Failed to retrieve meme generator response:",
				res.status,
				res.statusText,
			);
		const html = await res.text();
		const match = html.match(/\bmemes\s*=\s*[{[]/);

		if (!match?.index)
			return console.error("Failed to find memes object inside response");
		return findJSONObjectAround<Meme[]>(
			html,
			match.index + match[0].length - 1,
			0,
		);
	};

	private static getSettings = async (url: URL) => {
		if (url.origin !== "https://imgflip.com") return;
		const match = url.pathname.match(/\/s\/meme\/([^./]+)\.([^/]+)$/);

		if (!match) return;
		const [, name, ext] = match;
		const memes = await this.loadMemes();
		return JSON.parse(
			memes?.find((m) => m.url_name === name && m.file_type === ext)
				?.default_settings ?? "[]",
		) as TextSettings[];
	};

	static override async chatInput(
		{ reply, defer }: ChatInputReplies,
		{
			options: { template, text1, text2, text3 },
			fullRoute,
		}: ChatInputArgs<typeof Meme.chatInputData>,
	) {
		const url = new URL(
			template,
			URL.canParse(template) ? undefined : "https://imgflip.com/s/meme/",
		);
		const [img, settings] = await Promise.all([
			fetch(url),
			this.getSettings(url).catch(console.error),
		]);
		if (!img.ok || !img.body)
			return reply({ content: "Impossibile caricare l'immagine di template!" });
		defer();
		const transformer = env.IMAGES.input(img.body);

		await Promise.all([
			this.applyText(transformer, text1, settings?.[0]),
			text2 &&
				(!settings || settings[1]) &&
				this.applyText(transformer, text2, settings?.[1]),
			text3 &&
				(!settings || settings[2]) &&
				this.applyText(transformer, text3, settings?.[2]),
		]);
		const result = await transformer.output({ format: "image/png" });
		return rest.patch(fullRoute, {
			body: {
				attachments: [{ id: 0, filename: "meme.png" }],
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
			files: [
				{
					data: await result.response().bytes(),
					name: "meme.png",
					contentType: "image/png",
				},
			],
		});
	}

	static override async autocomplete(
		{ autocomplete }: AutoCompleteReplies,
		{ options: { template } }: AutoCompleteArgs<(typeof Meme)["chatInputData"]>,
	) {
		const memes = await this.loadMemes();

		if (!memes) return autocomplete();
		return autocomplete({
			choices: memes
				.map<[SearchScore, Meme]>((meme) => {
					if (!template) return [SearchScore.PartialNameMatchStart, meme];
					if (template === meme.id) return [SearchScore.FullIDMatch, meme];
					if (template === meme.name) return [SearchScore.FullNameMatch, meme];
					if (template === meme.url_name)
						return [SearchScore.FullURLMatch, meme];
					const alts = meme.altNames.split(/\s*,\s*/g);
					if (alts.includes(template)) return [SearchScore.FullAltMatch, meme];
					if (meme.name.startsWith(template))
						return [SearchScore.PartialNameMatchStart, meme];
					if (alts.some((a) => a.startsWith(template)))
						return [SearchScore.PartialAltMatchStart, meme];
					if (meme.name.includes(template))
						return [SearchScore.PartialNameMatch, meme];
					if (alts.some((a) => a.includes(template)))
						return [SearchScore.PartialAltMatch, meme];
					return [SearchScore.NoMatch, meme];
				})
				.filter(([s]) => s)
				.sort(([a], [b]) => b - a)
				.slice(0, 25)
				.map(([, m]) => ({
					name: m.name,
					value: `${m.url_name}.${m.file_type}`,
				})),
		});
	}

	private static applyText = async (
		transformer: ImageTransformer,
		text: string,
		settings?: TextSettings,
	) => {
		const words: ResolvedText[] = await Promise.all(
			text.split(/\s+/g).map(async (t): Promise<ResolvedText> => {
				let size = settings?.font_max_size ?? 50;
				const info = (await env.IMAGES.info(
					(
						await this.createText(t, settings, size).output({
							format: "image/png",
						})
					).image(),
				)) as Extract<ImageInfoResponse, { fileSize: number }>;

				// size : info.width = newSize : settings.w
				if (settings && info.width > settings.w) {
					const ratio = Math.floor(size * (settings.w / info.width)) / size;

					info.width *= ratio;
					info.height *= ratio;
					size *= ratio;
				}
				return { text: t, height: info.height, width: info.width, size };
			}),
		);
		const lines = words.reduce<ResolvedText[][]>(
			(lines, word) => {
				const line = lines.at(-1)!;
				const lineWidth =
					line.reduce<number>((t, s) => t + s.width, 0) +
					word.width +
					word.size * 0.4 * line.length;

				if (settings && lineWidth > settings.w && line.length)
					lines.push([word]);
				else line.push(word);
				return lines;
			},
			[[]],
		);
		const lineHeight =
			lines.reduce<number>(
				(h, l) => l.reduce<number>((g, w) => Math.max(g, w.height), h),
				0,
			) * 1.2;
		const textHeight = lineHeight * lines.length;
		let top = settings?.y ?? 40;

		if (settings?.vertical_align === "middle")
			top += (settings.h - textHeight) / 2;
		else if (settings?.vertical_align === "bottom")
			top += settings.h - textHeight;
		for (const line of lines) {
			const lineWidth = line.reduce<number>(
				(w, t) => w + t.size + t.width,
				-line[0]!.size,
			);
			let left = settings?.x ?? 40;

			if (settings?.text_align === "center")
				left += (settings.w - lineWidth) / 2;
			transformer.draw(
				this.createText(
					line.map((l) => l.text).join(" "),
					settings,
					line[0]?.size,
				),
				{ top, left },
			);
			top += lineHeight;
		}
	};

	private static createText = (
		text: string,
		settings?: TextSettings,
		size = 50,
	) => {
		const transformer = env.IMAGES.text(
			settings?.force_caps ? text.toUpperCase() : text,
			{
				font: {
					url: `https://test-bot.trombett.org/fonts/${settings?.font && this.FONTS.includes(settings.font) ? settings.font : "arial"}.ttf`,
				},
				color: settings?.font_color ?? "#000000",
				size,
			},
		);
		const rotate =
			settings?.rotation ? Math.round(settings.rotation / 90) * 90 : 0;

		if (rotate !== 0 && rotate !== 369) transformer.transform({ rotate });
		return transformer;
	};
}
