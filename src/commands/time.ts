import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { time as fTime, TimestampStyles } from "@discordjs/formatters";
import { DiscordSnowflake } from "@sapphire/snowflake";
import {
	APIMessage,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	InteractionResponseType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
	type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { setTimeout } from "node:timers/promises";
import { resolveCommandOptions, rest, type CommandOptions } from "../util";

const formatTime = (ms: number): string => {
	const sign = ms >= 0 ? "" : "-";
	const hours = Math.floor((ms = Math.abs(ms)) / 3_600_000);
	const last = `${Math.floor((ms % 3_600_000) / 60_000)
		.toString()
		.padStart(2, "0")}:${Math.floor((ms % 60_000) / 1_000)
		.toString()
		.padStart(2, "0")}.${(ms % 1000).toString().padStart(3, "0")}`;

	return `${sign}${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}${last}`;
};

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
				{
					name: "compare-ids",
					description: "Calcola la differenza di tempo tra due ID",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "id1",
							description: "Primo ID",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
						{
							name: "id2",
							description: "Secondo ID",
							type: ApplicationCommandOptionType.String,
							required: true,
						},
					],
				},
			],
		},
	],
	run: async (reply, { interaction }) => {
		const { subcommand, options } = resolveCommandOptions(
			time.data,
			interaction,
		);

		if (subcommand === "stopwatch") {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Cronometro avviato",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId("time-stop")
									.setLabel("Ferma")
									.setEmoji({ name: "⏹️" })
									.setStyle(ButtonStyle.Primary),
							)
							.toJSON(),
					],
				} satisfies RESTPostAPIWebhookWithTokenJSONBody,
			});
			await setTimeout(300);
			const { id } = (await rest.get(
				Routes.webhookMessage(interaction.application_id, interaction.token),
			)) as APIMessage;

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Cronometro avviato ${fTime(Math.round(DiscordSnowflake.timestampFrom(id) / 1000), TimestampStyles.RelativeTime)}`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Differenza di tempo tra i due ID: **${formatTime(
						DiscordSnowflake.timestampFrom(options.id2) -
							DiscordSnowflake.timestampFrom(options.id1),
					)}**`,
				} satisfies RESTPostAPIWebhookWithTokenJSONBody,
			});
	},
	component: (reply, { interaction }) => {
		if (interaction.data.custom_id === "time-stop")
			if (
				interaction.message.interaction_metadata?.user.id ===
				(interaction.member ?? interaction).user?.id
			)
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
			else
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non puoi gestire questo cronometro!",
						flags: MessageFlags.Ephemeral,
					},
				});
	},
} as const satisfies CommandOptions<ApplicationCommandType.ChatInput>;
