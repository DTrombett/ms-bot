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

export class Meme extends Command {
	private static readonly choices: APIApplicationCommandOptionChoice<string>[] =
		[
			{ name: "Drake Hotline Bling", value: "Drake-Hotline-Bling.jpg" },
			{ name: "Two Buttons", value: "Two-Buttons.jpg" },
			{ name: "Distracted Boyfriend", value: "Distracted-Boyfriend.jpg" },
		];
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
				choices: Meme.choices,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static loadMemes = async () => {
		const res = await fetchCache(
			"https://imgflip.com/memegenerator",
			{},
			86400,
		);
		if (!res.ok) return [];
		const html = await res.text();
		const match = html.match(/\bmemes\s*=\s*[{[]/);

		if (!match?.index) return [];
		return findJSONObjectAround<
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
	};
	static override async chatInput(
		{ reply, defer }: ChatInputReplies,
		{
			options: { template },
			fullRoute,
		}: ChatInputArgs<typeof Meme.chatInputData>,
	) {
		const [img, memes] = await Promise.all([
			fetch(
				URL.canParse(template) ? template : (
					new URL(template, "https://imgflip.com/s/meme/")
				),
			),
			this.loadMemes().catch(() => []),
		]);

		if (!img.ok || !img.body)
			return reply({ content: "Impossibile caricare l'immagine di template!" });
		defer();
		const settings: {
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
		}[] = JSON.parse(
			memes.find((m) => `${m.url_name}.${m.file_type}` === template)
				?.default_settings ?? "[]",
		);
		const result = await env.IMAGES.input(img.body)
			.draw(
				env.IMAGES.text("hello", {
					font: {
						url: `https://test-bot.trombett.org/fonts/${settings[0]?.font ?? "arial"}.ttf`,
					},
					color: settings[0]?.font_color ?? "#000000",
					size: 50,
				}),
				{ top: settings[0]?.y ?? 40, right: settings[0]?.x ?? 40 },
			)
			.output({ format: "image/png" });

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
}
