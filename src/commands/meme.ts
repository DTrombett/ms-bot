import Canvas from "@napi-rs/canvas";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	AttachmentBuilder,
} from "discord.js";
import { join } from "node:path";
import { cwd } from "node:process";
import {
	CustomClient,
	createCommand,
	normalizeError,
	sendError,
} from "../util";

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
	text?: number;
};

const memes: Record<
	string,
	{ dimensions: Coord; textPoints: TextPoint[] } | undefined
> = {
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
				borderColor: "#000000",
			},
		],
	},
	"Distracted Boyfriend": {
		dimensions: [1200, 800],
		textPoints: [
			{
				coord: [350, 550],
				dimensions: [340, 200],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [770, 400],
				dimensions: [250, 166],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [1030, 500],
				dimensions: [250, 200],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
		],
	},
	"Running Away Balloon": {
		dimensions: [761, 1024],
		textPoints: [
			{
				coord: [170, 370],
				dimensions: [280, 130],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [605, 210],
				dimensions: [310, 130],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [110, 830],
				dimensions: [200, 170],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [360, 840],
				dimensions: [220, 140],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
				text: 0,
			},
			{
				coord: [675, 690],
				dimensions: [170, 130],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
				text: 1,
			},
		],
	},
	"UNO Draw 25 Cards": {
		dimensions: [500, 494],
		textPoints: [
			{ coord: [150, 200], dimensions: [180, 80], fontFamily: "Comic Sans MS" },
			{ coord: [385, 40], dimensions: [240, 80] },
		],
	},
	"Left Exit 12 Off Ramp": {
		dimensions: [804, 767],
		textPoints: [
			{ coord: [255, 185], dimensions: [120, 130], color: "#ffffff" },
			{ coord: [505, 185], dimensions: [170, 130], color: "#ffffff" },
			{
				coord: [410, 600],
				dimensions: [320, 100],
				color: "#ffffff",
				rotate: -Math.PI / 36,
			},
		],
	},
	"Bernie I Am Once Again Asking For Your Support": {
		dimensions: [750, 750],
		textPoints: [
			{
				coord: [380, 665],
				dimensions: [500, 40],
				color: "#ffffff",
				fontSize: 40,
				bold: true,
			},
		],
	},
	"Change My Mind": {
		dimensions: [482, 361],
		textPoints: [
			{
				coord: [320, 258],
				dimensions: [210, 90],
				fontSize: 32,
				rotate: -Math.PI / 24,
			},
		],
	},
	"Buff Doge vs. Cheems": {
		dimensions: [937, 720],
		textPoints: [
			{ coord: [250, 40], dimensions: [410, 70] },
			{ coord: [760, 80], dimensions: [350, 70] },
			{ coord: [230, 600], dimensions: [400, 180] },
			{ coord: [725, 620], dimensions: [350, 180] },
		],
	},
	"Sad Pablo Escobar": {
		dimensions: [720, 709],
		textPoints: [
			{
				coord: [330, 290],
				dimensions: [500, 120],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [180, 650],
				dimensions: [340, 100],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
			},
			{
				coord: [540, 650],
				dimensions: [340, 100],
				fontFamily: "Impact",
				color: "#ffffff",
				borderColor: "#000000",
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
		(context.font = `${italic ? "italic " : ""}${
			bold ? "bold " : ""
		}${fontSize}px ${fontFamily}`);
	const lines: string[] = [];
	const lineBreaks = text.split("\n");

	if (fontSize > height) fontSize = height;
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
				if (
					(lines.length + 2) * fontSize > height ||
					context.measureText(line).width > width
				) {
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
			context.lineWidth = fontSize / 25;
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
					name: "testo4",
					description: "Il quarto testo del meme",
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "dimensione-carattere",
					description:
						"La dimensione massima del carattere da utilizzare in pixel (default: 100)",
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
		const background = await Canvas.loadImage(
			join(cwd(), "templates", `${name}.png`),
		).catch(normalizeError);

		if (background instanceof Error) {
			await sendError(interaction, background);
			return;
		}
		const fontSize =
			interaction.options.getNumber("dimensione-carattere") ?? undefined;
		const fontFamily = interaction.options.getString("carattere") ?? undefined;
		const bold = interaction.options.getBoolean("grassetto") ?? undefined;
		const italic = interaction.options.getBoolean("corsivo") ?? undefined;

		context.drawImage(background, 0, 0);
		context.textAlign = "center";
		context.textBaseline = "middle";
		for (let i = 0, j = 0; i < meme.textPoints.length; i++) {
			const text =
				(meme.textPoints[i].text === undefined
					? interaction.options.getString(`testo${j + 1}`)
					: interaction.options.getString(
							`testo${meme.textPoints[i].text! + 1}`,
					  )) ?? "";

			if (text)
				drawTextInBox(
					context,
					meme.textPoints[i],
					text,
					fontSize,
					fontFamily,
					bold,
					italic,
				);
			if (meme.textPoints[i].text === undefined) j++;
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
		const value =
			interaction.options.getString("template")?.toLowerCase() ?? "";

		await interaction.respond(
			memeNames
				.filter((name) => name.toLowerCase().includes(value))
				.slice(0, 25)
				.map((name) => ({ name, value: name })),
		);
	},
});
