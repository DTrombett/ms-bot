import Canvas from "@napi-rs/canvas";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
} from "discord.js";
import { join } from "node:path";
import { cwd } from "node:process";
import { CustomClient, createCommand, normalizeError, sendError } from "../util";

type Coord = [number, number];
type TextPoint = {
	coord: Coord;
	dimensions: Coord;
	color?: string;
	rotate?: number;
	fontSize?: number;
	fontFamily?: string;
	bold?: boolean;
	italic?: boolean;
	borderColor?: string;
};

const memes: Record<string, { dimensions: Coord; textPoints: TextPoint[] } | undefined> = {
	"Drake Hotline Bling": {
		dimensions: [1200, 1200],
		textPoints: [
			{ coord: [903, 300], dimensions: [596, 596] },
			{ coord: [903, 900], dimensions: [596, 596] },
		],
	},
	"Two Buttons": {
		dimensions: [600, 908],
		textPoints: [
			{ coord: [160, 140], dimensions: [150, 83], rotate: -Math.PI / 18 },
			{ coord: [350, 100], dimensions: [110, 70], rotate: -Math.PI / 18 },
			{
				coord: [308, 807],
				dimensions: [546, 113],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "black",
			},
		],
	},
};
const memeNames = Object.keys(memes);
const drawTextInBox = (
	context: Canvas.SKRSContext2D,
	point: TextPoint,
	text: string,
	fontSize = point.fontSize ?? 100,
	fontFamily = point.fontFamily ?? "Arial",
	bold = point.bold ?? false,
	italic = point.italic ?? false,
) => {
	context.save();
	const {
		coord: [x, y],
		dimensions: [width, height],
		color = "#000000",
		rotate = 0,
		borderColor = "",
	} = point;
	const buildFont = () =>
		(context.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px ${fontFamily}`);
	const lines: string[] = [];
	const lineBreaks = text.split("\n");

	buildFont();
	context.translate(x, y);
	context.fillStyle = color;
	if (rotate) context.rotate(rotate);
	if (borderColor) context.strokeStyle = borderColor;
	for (let i = 0; i < lineBreaks.length; i++) {
		const words = lineBreaks[i].split(" ");
		let line = "";
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		const reset = () => {
			lines.length = 0;
			line = "";
			fontSize--;
			buildFont();
			i = -1;
		};

		for (let j = 0; j < words.length; j++) {
			const testLine = `${line + words[j]} `;

			if (context.measureText(testLine).width > width) {
				if ((lines.length + 2) * fontSize > height || context.measureText(line).width > width) {
					reset();
					break;
				}
				lines.push(line);
				line = `${words[j]} `;
			} else line = testLine;
			if (j === words.length - 1 && context.measureText(line).width > width) {
				reset();
				break;
			}
		}
		if (line) lines.push(line);
	}
	const startY = -((lines.length - 1) * fontSize) / 2;

	for (let i = 0; i < lines.length; i++) {
		const newY = startY + i * fontSize;

		context.fillText(lines[i], 0, newY);
		if (borderColor) {
			context.lineWidth = fontSize / 30;
			context.strokeText(lines[i], 0, newY);
		}
	}
	context.restore();
};

export const memeCommand = createCommand({
	data: [
		{
			name: "meme",
			description: "Crea un meme personalizzato a partire da un template",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "template",
					description: "Il template da usare",
					autocomplete: true,
					required: true,
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "testo1",
					description: "Il primo testo del meme",
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "testo2",
					description: "Il secondo testo del meme",
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "testo3",
					description: "Il terzo testo del meme",
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "dimensione-carattere",
					description: "La dimensione massima del carattere da utilizzare in pixel (default: 100)",
					type: ApplicationCommandOptionType.Number,
				},
				{
					name: "carattere",
					description: "Il carattere da usare (default: Arial)",
					type: ApplicationCommandOptionType.String,
					choices: [
						{ name: "Impact", value: "Impact" },
						{ name: "Arial", value: "Arial" },
						{ name: "Comic Sans MS", value: "Comic Sans MS" },
						{ name: "Times New Roman", value: "Times New Roman" },
						{ name: "Courier New", value: "Courier New" },
						{ name: "Verdana", value: "Verdana" },
						{ name: "Georgia", value: "Georgia" },
						{ name: "Garamond", value: "Garamond" },
						{ name: "Trebuchet MS", value: "Trebuchet MS" },
					],
				},
				{
					name: "grassetto",
					description: "Se scrivere il testo in grassetto (default: no)",
					type: ApplicationCommandOptionType.Boolean,
				},
				{
					name: "corsivo",
					description: "Se scrivere il testo in corsivo (default: no)",
					type: ApplicationCommandOptionType.Boolean,
				},
			],
		},
	],
	async run(interaction) {
		const name = interaction.options.getString("template", true);
		const meme = memes[name];

		if (!meme) {
			await interaction.reply({
				content: "This template doesn't exist!",
				ephemeral: true,
			});
			return;
		}
		const canvas = Canvas.createCanvas(...meme.dimensions);
		const context = canvas.getContext("2d");
		const background = await Canvas.loadImage(join(cwd(), "templates", `${name}.png`)).catch(
			normalizeError,
		);

		if (background instanceof Error) {
			await sendError(interaction, background);
			return;
		}
		const fontSize = interaction.options.getNumber("dimensione-carattere") ?? undefined;
		const fontFamily = interaction.options.getString("carattere") ?? undefined;
		const bold = interaction.options.getBoolean("grassetto") ?? undefined;
		const italic = interaction.options.getBoolean("corsivo") ?? undefined;

		context.drawImage(background, 0, 0);
		context.textAlign = "center";
		context.textBaseline = "middle";
		for (let i = 0; i < meme.textPoints.length; i++) {
			const text = interaction.options.getString(`testo${i + 1}`) ?? "";

			if (text)
				drawTextInBox(context, meme.textPoints[i], text, fontSize, fontFamily, bold, italic);
		}
		const [attachment] = await Promise.all([
			canvas.encode("png").catch(normalizeError),
			interaction.deferReply().catch(CustomClient.printToStderr),
		]);

		if (attachment instanceof Error) {
			await sendError(interaction, attachment);
			return;
		}
		await interaction.editReply({
			files: [new AttachmentBuilder(attachment)],
		});
	},
	autocomplete: async (interaction) => {
		const value = interaction.options.getString("template")?.toLowerCase() ?? "";

		await interaction.respond(
			memeNames
				.filter((name) => name.toLowerCase().includes(value))
				.map((name) => ({ name, value: name })),
		);
	},
});
