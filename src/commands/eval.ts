import { codeBlock } from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from "discord-api-types/v10";
import type {
	ApplicationCommandOptionChoiceData,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Interaction,
} from "discord.js";
import { Colors, escapeCodeBlock } from "discord.js";
import EventEmitter from "node:events";
import { homedir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import type { REPLServer, writer } from "node:repl";
import { REPL_MODE_STRICT, start } from "node:repl";
import { Readable, Writable } from "node:stream";
import { createCommand, CustomClient } from "../util";

const input = new Readable({
	highWaterMark: 1e6,
	encoding: "utf8",
	read: () => {
		// noop
	},
});
const output = new EventEmitter({ captureRejections: true });
const replServer = start({
	input,
	output: new Writable({
		defaultEncoding: "utf8",
		highWaterMark: 1e6,
		decodeStrings: false,
		write: (chunk, _, next) => {
			output.emit("data", chunk);
			next();
		},
	}),
	prompt: "",
	replMode: REPL_MODE_STRICT,
}) as REPLServer & { writer: typeof writer };
const addContext = (interaction: Interaction) => {
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	replServer.context.command = command;
	replServer.context.replServer = replServer;
	replServer.context.interaction = interaction;
	replServer.context.client = interaction.client;
};
const setInspectOptions = (
	interaction: AutocompleteInteraction | ChatInputCommandInteraction
) => {
	const { options } = replServer.writer;
	const isPC = !interaction.guild?.presences.cache.get(interaction.user.id)
		?.clientStatus?.mobile;

	options.colors = isPC;
	options.showHidden = interaction.options.getBoolean("show-hidden") ?? false;
	options.depth = interaction.options.getInteger("depth") ?? 3;
	options.showProxy = interaction.options.getBoolean("show-proxy") ?? true;
	options.maxArrayLength =
		interaction.options.getInteger("max-array-length") ?? 100;
	options.maxStringLength =
		interaction.options.getInteger("max-string-length") ?? 1000;
	options.breakLength = isPC ? 66 : 39;
};

replServer.setupHistory(join(homedir(), ".node_repl_history"), (err) => {
	if (err) CustomClient.printToStderr(err);
});

export const command = createCommand({
	data: [
		{
			name: "eval",
			description: "Esegui del codice JavaScript",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "code",
					description: "Codice da eseguire",
					required: true,
					autocomplete: true,
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: "show-hidden",
					description: "Se mostrare le proprietà nascoste (default: false)",
				},
				{
					type: ApplicationCommandOptionType.Integer,
					name: "depth",
					description: "Profondità di esecuzione (default: 3)",
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: "show-proxy",
					description: "Se includere le proprietà proxy (default: true)",
				},
				{
					type: ApplicationCommandOptionType.Integer,
					name: "max-array-length",
					description:
						"Il numero massimo di elementi da mostrare in un array (default: 100)",
				},
				{
					type: ApplicationCommandOptionType.Integer,
					name: "max-string-length",
					description:
						"Il numero massimo di caratteri da mostrare in una stringa (default: 1000)",
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: "ephemeral",
					description:
						"Se il risultato può essere visto solo da te (default: true)",
				},
			],
		},
	],
	isPrivate: true,
	async run(interaction) {
		let delay!: number;
		const code = interaction.options.getString("code", true);
		const previous = performance.now();
		const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;
		const [result] = await Promise.all([
			new Promise<string>((resolve) => {
				output.once("data", (chunk) => {
					delay = performance.now() - previous;
					resolve(
						typeof chunk === "string"
							? chunk.slice(0, -1)
							: CustomClient.inspect(chunk)
					);
					delete replServer.context.interaction;
				});
				setInspectOptions(interaction);
				addContext(interaction);
				input.push(`${code}\n`);
			}),
			interaction
				.deferReply({
					ephemeral,
				})
				.catch(CustomClient.printToStderr),
		]);

		await interaction.editReply({
			content: `Eval elaborato in ${delay}ms`,
			embeds: [
				{
					author: {
						name: interaction.user.tag,
						icon_url: interaction.user.displayAvatarURL(),
					},
					title: "Eval output",
					description: codeBlock(
						"ansi",
						escapeCodeBlock(result).slice(0, 4096 - 11)
					),
					color: Colors.Blurple,
					timestamp: new Date().toISOString(),
					fields: [
						{
							name: "Input",
							value: codeBlock("js", escapeCodeBlock(code).slice(0, 1024 - 9)),
						},
					],
				},
			],
		});
	},
	async autocomplete(interaction) {
		const option = interaction.options.getFocused(true);

		if (option.name !== "code") return;
		if (option.value.length >= 100) {
			await interaction.respond([]);
			return;
		}
		addContext(interaction);
		const split = option.value.split("\n");
		const old = `${split.slice(0, -1).join(" ")} `.trim();
		const last = split.at(-1)!;
		const autocomplete = await new Promise<string[]>((resolve) => {
			replServer.completer(last, (err, r) => {
				if (err) {
					CustomClient.printToStderr(err);
					resolve([]);
				} else resolve(r?.[0] ?? []);
				delete replServer.context.interaction;
			});
		});

		await interaction.respond(
			autocomplete
				.slice(0, 25)
				.map<ApplicationCommandOptionChoiceData | null>((a) => {
					let n = a;

					for (let i = 0; i < last.length; i++)
						if (a.startsWith(last.slice(i))) {
							n = `${last.slice(0, i)}${a}`;
							break;
						}
					if (!n) return null;
					const value = `${old}${n}`;

					if (value.length > 100) return null;
					return {
						name: value,
						value,
					};
				})
				.filter((v): v is ApplicationCommandOptionChoiceData => v != null)
		);
	},
});
