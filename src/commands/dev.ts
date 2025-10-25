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
import Command from "../Command.ts";
import normalizeError from "../util/normalizeError.ts";
import { rest } from "../util/rest.ts";
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
			isDev
				? []
				: (
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
					(options.duration
						? options.duration === "Infinity"
							? Infinity
							: parseTime(options.duration)
						: 0) || 24 * 60 * 60 * 1000,
				interaction: {
					application_id: interaction.application_id,
					token: interaction.token,
				},
			},
		});
	};
}
