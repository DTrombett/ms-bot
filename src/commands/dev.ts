import { inlineCode } from "@discordjs/formatters";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	type APIApplicationCommand,
	type APIApplicationCommandInteractionDataBooleanOption,
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataSubcommandOption,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import { ok } from "node:assert";
import { normalizeError, rest, type CommandOptions } from "../util";
import * as commandsObject from "./index";

export const dev: CommandOptions<ApplicationCommandType.ChatInput> = {
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
			],
		},
	],
	run: async (reply, { interaction, env }) => {
		const options = new Map<
			string,
			APIApplicationCommandInteractionDataOption
		>();
		const [subcommand] = interaction.data
			.options as APIApplicationCommandInteractionDataSubcommandOption[];

		ok(subcommand);
		for (const option of subcommand.options!) options.set(option.name, option);
		reply({
			type: InteractionResponseType.DeferredChannelMessageWithSource,
			data: { flags: MessageFlags.Ephemeral },
		});
		if (subcommand.name === "register-commands") {
			const commands = Object.values(commandsObject);
			const { value: isDev } = (options.get("dev") ?? {
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
						content: `Private commands: ${inlineCode(privateAPICommands instanceof Error ? privateAPICommands.message : privateAPICommands.map((c) => c.name).join(", "))}\nPublic commands: ${inlineCode(publicAPICommands instanceof Error ? publicAPICommands.message : publicAPICommands.map((c) => c.name).join(", "))}`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
	},
};
