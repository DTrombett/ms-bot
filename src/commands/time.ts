import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { time as fTime } from "@discordjs/formatters";
import { DiscordSnowflake } from "@sapphire/snowflake";
import {
	APIMessage,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	InteractionResponseType,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { setTimeout } from "node:timers/promises";
import { resolveCommandOptions, rest, type CommandOptions } from "../util";

const formatTime = (ms: number): string =>
	new Date(ms).toISOString().slice(ms >= 3600000 ? 11 : 14, -1);

export const time = {
	data: [
		{
			name: "time",
			description: "Vari comandi per gestire il tempo",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "stopwatch",
					description: "Fai partire il cronometro!",
					type: ApplicationCommandOptionType.Subcommand,
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		const { subcommand } = resolveCommandOptions(time.data, interaction);

		if ((subcommand as string) === "stopwatch") {
			reply({ type: InteractionResponseType.DeferredChannelMessageWithSource });
			await setTimeout(300);
			const { id } = (await rest.get(
				Routes.webhookMessage(interaction.application_id, interaction.token),
			)) as APIMessage;

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Cronometro avviato ${fTime(Math.round(DiscordSnowflake.timestampFrom(id) / 1000))}`,
						components: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId("timer-stop")
										.setLabel("Stop Timer")
										.setStyle(ButtonStyle.Danger),
								)
								.toJSON(),
						],
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
	},
	component: (reply, { interaction }) => {
		if (interaction.data.custom_id === "timer-stop")
			reply({
				type: InteractionResponseType.UpdateMessage,
				data: {
					content: `Cronometro fermato dopo **${formatTime(
						DiscordSnowflake.timestampFrom(interaction.id) -
							DiscordSnowflake.timestampFrom(interaction.message.id),
					)}**`,
					components: [],
				},
			});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
