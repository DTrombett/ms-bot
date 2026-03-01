import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	MessageFlags,
	Routes,
	type APIApplicationCommand,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPutAPIApplicationCommandsJSONBody,
	type RESTPutAPIApplicationGuildCommandsJSONBody,
} from "discord-api-types/v10";
import type { SessionState, Settings } from "node:http2";
import Command from "../Command.ts";
import normalizeError from "../util/normalizeError.ts";
import { toSearchParams } from "../util/objects.ts";
import { rest } from "../util/rest.ts";
import { template } from "../util/strings.ts";
import { parseTime } from "../util/time.ts";
import * as commandsObj from "./index.ts";

export class Dev extends Command {
	static override private = true;
	static override chatInputData = {
		name: "dev",
		description: "Developer commands",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "register-commands",
				description: "Register commands",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "dev",
						description: "Don't deploy globally",
						type: ApplicationCommandOptionType.Boolean,
					},
				],
			},
			{
				name: "api",
				description: "Manage the private API",
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: [
					{
						name: "set-dev",
						description: "Enable/disable development mode",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "dev",
								description: "The development mode (default: true)",
								type: ApplicationCommandOptionType.Boolean,
							},
						],
					},
					{
						name: "connections",
						description: "Get the number of connections",
						type: ApplicationCommandOptionType.Subcommand,
					},
					{
						name: "clients",
						description: "Get the outbound clients info",
						type: ApplicationCommandOptionType.Subcommand,
					},
					{
						name: "logs",
						description: "Get the last logs",
						type: ApplicationCommandOptionType.Subcommand,
						options: [
							{
								name: "output",
								description: "The output type (default: cat)",
								type: ApplicationCommandOptionType.String,
								choices: [
									{ name: "short", value: "short" },
									{ name: "short-full", value: "short-full" },
									{ name: "short-iso", value: "short-iso" },
									{ name: "short-iso-precise", value: "short-iso-precise" },
									{ name: "short-precise", value: "short-precise" },
									{ name: "short-monotonic", value: "short-monotonic" },
									{ name: "short-unix", value: "short-unix" },
									{ name: "verbose", value: "verbose" },
									{ name: "export", value: "export" },
									{ name: "json", value: "json" },
									{ name: "cat", value: "cat" },
								],
							},
							{
								name: "explain",
								description: "Add details about restarts (default: true)",
								type: ApplicationCommandOptionType.Boolean,
							},
							{
								name: "since",
								description: "Start date",
								type: ApplicationCommandOptionType.String,
							},
							{
								name: "until",
								description: "End date",
								type: ApplicationCommandOptionType.String,
							},
							{
								name: "lines",
								description: "The number of lines",
								type: ApplicationCommandOptionType.Integer,
							},
							{
								name: "boot",
								description: "The boot ID",
								type: ApplicationCommandOptionType.Integer,
							},
						],
					},
				],
			},
			{
				name: "shorten",
				description: "Shorten a url",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "url",
						description: "The destination address",
						required: true,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "source",
						description: "The path of the url (default: random 8 bytes)",
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "duration",
						description:
							"When to delete the url, Infinity for never (default: 1d)",
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "status",
						description: "The status code to send (default: 301)",
						choices: [
							{ name: "301", value: 301 },
							{ name: "302", value: 302 },
							{ name: "307", value: 307 },
							{ name: "308", value: 308 },
						],
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "preserve-query",
						description: "Preserve the source query (default: false)",
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "preserve-path",
						description: "Preserve the path suffix (default: false)",
					},
				],
			},
		],
	} as const satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;
	static "register-commands" = async (
		{ defer, edit }: ChatInputReplies,
		{ options }: ChatInputArgs<typeof Dev.chatInputData, "register-commands">,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		const commands = Object.values(commandsObj);
		const isDev = options.dev ?? env.NODE_ENV !== "production";
		const [privateAPICommands, publicAPICommands] = await Promise.all([
			(
				rest.put(
					Routes.applicationGuildCommands(
						env.DISCORD_APPLICATION_ID,
						env.TEST_GUILD,
					),
					{
						body: commands
							.filter((c) => isDev || c.private)
							.flatMap((file) => [
								...(file.chatInputData ? [file.chatInputData] : []),
								...(file.contextMenuData ?? []),
							]) satisfies RecursiveReadonly<RESTPutAPIApplicationGuildCommandsJSONBody>,
					},
				) as Promise<APIApplicationCommand[]>
			).catch(normalizeError),
			isDev ?
				[]
			:	(
					rest.put(Routes.applicationCommands(env.DISCORD_APPLICATION_ID), {
						body: commands
							.filter((c) => !c.private)
							.flatMap((file) => [
								...(file.chatInputData ? [file.chatInputData] : []),
								...(file.contextMenuData ?? []),
							]) satisfies RecursiveReadonly<RESTPutAPIApplicationCommandsJSONBody>,
					}) as Promise<APIApplicationCommand[]>
				).catch(normalizeError),
		]);

		await edit({
			content: `Private commands: \`${privateAPICommands instanceof Error ? privateAPICommands.message : privateAPICommands.map((c) => c.name).join(", ")}\`\nPublic commands: \`${publicAPICommands instanceof Error ? publicAPICommands.message : publicAPICommands.map((c) => c.name).join(", ")}\``,
		});
	};
	static shorten = async (
		{ defer }: ChatInputReplies,
		{
			interaction,
			options,
		}: ChatInputArgs<typeof Dev.chatInputData, "shorten">,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		return env.SHORTEN.create({
			params: {
				source: (options.source ??= btoa(
					String.fromCharCode(...crypto.getRandomValues(new Uint8Array(8))),
				)
					.replace(/\+/g, "-")
					.replace(/\//g, "_")
					.replace(/=+$/, "")),
				url: options.url,
				status: options.status,
				preserveQuery: options["preserve-query"],
				preservePath: options["preserve-path"],
				duration:
					(options.duration ?
						options.duration === "Infinity" ?
							Infinity
						:	parseTime(options.duration)
					:	0) || 24 * 60 * 60 * 1000,
				interaction: {
					application_id: interaction.application_id,
					token: interaction.token,
				},
			},
		});
	};
	static "api set-dev" = async (
		{ defer, edit }: ChatInputReplies,
		{ options }: ChatInputArgs<typeof Dev.chatInputData, "api set-dev">,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		const res = await fetch(
			`https://ms-api.trombett.org/dev/${options.dev ?? "true"}`,
			{ method: "POST", headers: { "x-env": env.NODE_ENV } },
		);

		if (res.headers.get("content-type")?.split(";")[0] !== "application/json")
			return edit({
				content: `${res.status} ${res.statusText}: ${await res
					.text()
					.catch((err) => normalizeError(err).message)
					.then((t) => t.slice(0, 1000))}`,
			});
		const body = await res.json<{ dev: boolean; devIP?: string }>();
		return edit({
			content: `**${body.dev ? "Enabled" : "Disabled"}!**\nIP: ${body.devIP}`,
		});
	};
	static "api connections" = async ({ defer, edit }: ChatInputReplies) => {
		defer({ flags: MessageFlags.Ephemeral });
		const res = await fetch(`https://ms-api.trombett.org/connections`, {
			headers: { "x-env": env.NODE_ENV },
		});

		if (res.headers.get("content-type")?.split(";")[0] !== "application/json")
			return edit({
				content: `${res.status} ${res.statusText}: ${await res
					.text()
					.catch((err) => normalizeError(err).message)
					.then((t) => t.slice(0, 1000))}`,
			});
		const body = await res.json<
			{ count: number } | { name: string; stack?: string; message: string }
		>();
		return edit({
			content:
				"count" in body ?
					`${body.count} open inbound connections!`
				:	`${body.name}: ${body.message}\n${body.stack ?? ""}`,
		});
	};
	static "api clients" = async ({ defer, edit }: ChatInputReplies) => {
		defer({ flags: MessageFlags.Ephemeral });
		const res = await fetch(`https://ms-api.trombett.org/clients`, {
			headers: { "x-env": env.NODE_ENV },
		});

		if (res.headers.get("content-type")?.split(";")[0] !== "application/json")
			return edit({
				content: `${res.status} ${res.statusText}: ${await res
					.text()
					.catch((err) => normalizeError(err).message)
					.then((t) => t.slice(0, 1000))}`,
			});
		const body =
			await res.json<
				{
					host: string;
					closed: boolean;
					destroyed: boolean;
					localSettings: Settings;
					pendingSettingsAck: boolean;
					ping?: number;
					remoteSettings: Settings;
					state: SessionState;
				}[]
			>();
		return edit({
			content: body
				.map(
					(c) => template`
						## ${c.host}
						${c.closed}**Closed**
						${c.destroyed}**Destroyed**
						${c.pendingSettingsAck}**Pending settings ack**
						${c.ping}**Ping**: ${c.ping}ms
						**Local settings**: \`${JSON.stringify(c.localSettings)}\`
						**Remote settings**: \`${JSON.stringify(c.remoteSettings)}\`
						**State**: \`${JSON.stringify(c.state)}\`
					`,
				)
				.join("\n"),
		});
	};
	static "api logs" = async (
		{ defer, edit }: ChatInputReplies,
		{ options }: ChatInputArgs<typeof Dev.chatInputData, "api logs">,
	) => {
		defer({ flags: MessageFlags.Ephemeral });
		const res = await fetch(
			`https://ms-api.trombett.org/logs?${toSearchParams(options).toString()}`,
			{ headers: { "x-env": env.NODE_ENV } },
		);
		const text = await res.text().catch((err) => normalizeError(err).message),
			lines: string[] = [];
		let length = 0;

		for (const line of text.split("\n"))
			if (line.length + length > 1985) break;
			else {
				lines.push(line);
				length += line.length + 1;
			}
		return edit({
			content: `${res.status}\n\`\`\`ansi\n${lines.reverse().join("\n")}\`\`\``,
		});
	};
}
