import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type APIApplicationCommandOptionChoice,
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

export class Meme extends Command {
	private static readonly CHOICES: APIApplicationCommandOptionChoice<string>[] =
		[
			{ name: "Drake Hotline Bling", value: "Drake-Hotline-Bling.jpg" },
			{ name: "Two Buttons", value: "Two-Buttons.jpg" },
			{ name: "Distracted Boyfriend", value: "Distracted-Boyfriend.jpg" },
		];
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
				choices: Meme.CHOICES,
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
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static loadSettings = async (url: URL) => {
		if (url.origin !== "https://imgflip.com") return;
		let match = url.pathname.match(/\/s\/meme\/([^./]+)\.([^/]+)$/);

		if (!match) return;
		const [, name, ext] = match;
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
		match = html.match(/\bmemes\s*=\s*[{[]/);
		if (!match?.index)
			return console.error("Failed to find memes object inside response");
		const memes = findJSONObjectAround<
			{
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
			}[]
		>(html, match.index + match[0].length - 1, 0);
		return JSON.parse(
			memes?.find((m) => m.url_name === name && m.file_type === ext)
				?.default_settings ?? "[]",
		) as TextSettings[];
	};
	static override async chatInput(
		{ reply, defer }: ChatInputReplies,
		{
			options: { template, text1, text2 },
			fullRoute,
		}: ChatInputArgs<typeof Meme.chatInputData>,
	) {
		// TODO: Add third text
		const url = new URL(
			template,
			URL.canParse(template) ? undefined : "https://imgflip.com/s/meme/",
		);
		const [img, settings] = await Promise.all([
			fetch(url),
			this.loadSettings(url).catch(console.error),
		]);
		if (!img.ok || !img.body)
			return reply({ content: "Impossibile caricare l'immagine di template!" });
		defer();
		console.log(settings);
		const transformer = env.IMAGES.input(img.body);

		await Promise.all([
			this.applyText(transformer, text1, settings?.[0]),
			text2 &&
				(!settings || settings[1]) &&
				this.applyText(transformer, text2, settings?.[1]),
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

	private static applyText = async (
		transformer: ImageTransformer,
		text: string,
		settings?: TextSettings,
	) => {
		const words: ResolvedText[] = await Promise.all(
			text.split(/\s+/g).map(async (t): Promise<ResolvedText> => {
				let size = settings?.font_max_size ?? 50;
				let info = (await env.IMAGES.info(
					(
						await this.createText(t, settings, size).output({
							format: "image/png",
						})
					).image(),
				)) as Extract<ImageInfoResponse, { fileSize: number }>;

				if (settings && info.width > settings.w) {
					size =
						// size : info.width = x : settings.w
						(size * settings.w) / info.width;
					info = (await env.IMAGES.info(
						(
							await this.createText(t, settings, size).output({
								format: "image/png",
							})
						).image(),
					)) as Extract<ImageInfoResponse, { fileSize: number }>;
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
		const lineHeight = lines.reduce<number>(
			(h, l) => l.reduce<number>((g, w) => Math.max(g, w.height), h),
			0,
		);
		const textHeight = lineHeight * lines.length;
		let top = settings?.y ?? 40;

		if (settings?.vertical_align === "middle")
			top += (settings.h - textHeight) / 2;
		for (const line of lines) {
			const lineWidth = line.reduce<number>(
				(w, t) => w + t.size + t.width,
				-line[0]!.size,
			);
			let left = settings?.x ?? 40;

			if (settings?.text_align === "center")
				left += (settings.w - lineWidth) / 2;
			// TODO: Apply rotation
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
	) =>
		env.IMAGES.text(settings?.force_caps ? text.toUpperCase() : text, {
			font: {
				url: `https://test-bot.trombett.org/fonts/${settings?.font && this.FONTS.includes(settings.font) ? settings.font : "arial"}.ttf`,
			},
			color: settings?.font_color ?? "#000000",
			size,
		});
}
