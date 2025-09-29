import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
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
import {
	formatTime,
	idDiff,
	resolveCommandOptions,
	rest,
	timeout,
	type CommandOptions,
} from "../util";

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
			await timeout();
			const { timestamp } = (await rest.get(
				Routes.webhookMessage(interaction.application_id, interaction.token),
			)) as APIMessage;

			await rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Cronometro avviato <t:${Math.round(Date.parse(timestamp) / 1000)}:R>`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		} else
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Differenza di tempo tra i due ID: **${formatTime(idDiff(options.id2, options.id1))}**`,
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
						content: `Cronometro fermato dopo **${formatTime(idDiff(interaction.id, interaction.message.id))}**`,
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
