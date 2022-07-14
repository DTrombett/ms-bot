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
import EventEmitter, { once } from "node:events";
import { performance } from "node:perf_hooks";
import { nextTick } from "node:process";
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
}) as REPLServer & { readonly writer: typeof writer };
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
	const clientStatus = interaction.guild?.presences.cache.get(
		interaction.user.id
	)?.clientStatus;
	const isPC = clientStatus?.desktop != null && clientStatus.mobile == null;

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
		const code = interaction.options.getString("code", true);
		const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;
		let delay!: number;
		const previous = performance.now();
		const [result] = await Promise.all([
			new Promise<string>((resolve) => {
				let value = "";
				let immediateId: NodeJS.Immediate;
				const callback = (chunk: string) => {
					chunk = chunk.trim();
					if (!chunk) return;
					clearImmediate(immediateId);
					delay = performance.now() - previous;
					value += `\n${chunk}`;
					immediateId = setImmediate(() => {
						resolve(value);
						output.removeListener("data", callback);
						delete replServer.context.interaction;
					});
				};

				output.on("data", callback);
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
		const [autocomplete, sub] = await new Promise<[string[], string]>(
			(resolve) => {
				replServer.completer(last, (err, r) => {
					if (err) CustomClient.printToStderr(err);
					resolve(r ?? [[], ""]);
				});
			}
		);
		if (autocomplete.length === 0) {
			await interaction.respond([]);
			delete replServer.context.interaction;
			return;
		}
		let only: string;
		if (
			(autocomplete.length === 1 ||
				(only = autocomplete.find((a) =>
					autocomplete.every((b) => b.startsWith(a))
				)!)) &&
			!old &&
			sub === last
		) {
			const { options } = replServer.writer;

			only ??= autocomplete[0];
			nextTick(() => input.push(`${only}\n`));
			options.colors = false;
			options.showHidden =
				interaction.options.getBoolean("show-hidden") ?? false;
			options.depth = interaction.options.getInteger("depth") ?? 2;
			options.showProxy = interaction.options.getBoolean("show-proxy") ?? false;
			options.maxArrayLength =
				interaction.options.getInteger("max-array-length") ?? 100;
			options.maxStringLength =
				interaction.options.getInteger("max-string-length") ?? 1000;
			options.breakLength = Infinity;
			options.compact = true;
			let [name]: string[] = await once(output, "data");

			name = name.trim();
			if (name.length > 100) name = `${name.slice(0, 97).trimEnd()}...`;
			if (name) {
				delete replServer.context.interaction;
				only = only.slice(0, 100);
				await interaction.respond([
					{
						name: only,
						value: only,
					},
					{
						name,
						value: only,
					},
				]);
				return;
			}
		}
		const options: ApplicationCommandOptionChoiceData[][] = [];
		let tempArray: ApplicationCommandOptionChoiceData[] = [];

		for (const a of autocomplete) {
			if (!a || tempArray.length >= 25) {
				options.push(tempArray);
				tempArray = [];
				continue;
			}
			const value = `${old}${last.replace(new RegExp(`${sub}$`), a)}`;

			if (value.length > 100) continue;
			tempArray.push({
				name: value,
				value,
			});
		}
		options.push(tempArray);
		delete replServer.context.interaction;
		await interaction.respond(options.reverse().flat().slice(0, 25));
	},
});
