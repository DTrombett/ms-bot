import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type APIApplicationCommand,
	type APIApplicationCommandInteractionDataBooleanOption,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import ms, { type StringValue } from "ms";
import {
	normalizeError,
	resolveCommandOptions,
	rest,
	type CommandOptions,
} from "../util";
import * as commandsObject from "./index";

export const dev = {
	isPrivate: true,
	data: [
		{
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
		},
	],
	run: async (reply, { interaction, env }) => {
		const { options, subcommand } = resolveCommandOptions(
			dev.data,
			interaction,
		);

		reply({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});
		if (subcommand === "register-commands") {
			const commands = Object.values(
				commandsObject,
			) as CommandOptions<ApplicationCommandType>[];
			const { value: isDev } = (options.dev ?? {
				value: env.NODE_ENV !== "production",
			}) as APIApplicationCommandInteractionDataBooleanOption;
			const [privateAPICommands, publicAPICommands] = await Promise.all([
				(
					rest.put(
						Routes.applicationGuildCommands(
							env.DISCORD_APPLICATION_ID,
							env.TEST_GUILD,
						),
						{
							body: commands
								.filter((c) => isDev || c.isPrivate)
								.flatMap((file) => file.data),
						},
					) as Promise<APIApplicationCommand[]>
				).catch(normalizeError),
				isDev
					? []
					: (
							rest.put(Routes.applicationCommands(env.DISCORD_APPLICATION_ID), {
								body: commands
									.filter((c) => !c.isPrivate)
									.flatMap((file) => file.data),
							}) as Promise<APIApplicationCommand[]>
						).catch(normalizeError),
			]);

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Private commands: \`${privateAPICommands instanceof Error ? privateAPICommands.message : privateAPICommands.map((c) => c.name).join(", ")}\`\nPublic commands: \`${publicAPICommands instanceof Error ? publicAPICommands.message : publicAPICommands.map((c) => c.name).join(", ")}\``,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else if ((subcommand as string) === "shorten")
			await env.SHORTEN.create({
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
								: ms(options.duration as StringValue)
							: 0) || 24 * 60 * 60 * 1000,
					interaction: {
						application_id: interaction.application_id,
						token: interaction.token,
					},
				},
			});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
