import {
	APIMessage,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	RESTPatchAPIWebhookWithTokenMessageJSONBody,
	Routes,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	formatTime,
	idDiff,
	rest,
	timeout,
	type ChatInputArgs,
	type ChatInputReplies,
	type ComponentArgs,
	type ComponentReplies,
} from "../util";

export class Time extends Command {
	static override chatInputData = {
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
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "time";
	override async chatInput(
		{ reply }: ChatInputReplies,
		{
			interaction,
			subcommand,
			options,
		}: ChatInputArgs<typeof Time.chatInputData>,
	) {
		if (subcommand === "stopwatch") {
			reply({
				content: "Cronometro avviato",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: "time-stop",
								label: "Ferma",
								emoji: { name: "⏹️" },
								style: ButtonStyle.Primary,
							},
						],
					},
				],
			});
			await timeout();
			const { timestamp } = (await rest.get(
				Routes.webhookMessage(interaction.application_id, interaction.token),
			)) as APIMessage;

			return rest.patch(
				Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					body: {
						content: `Cronometro avviato <t:${Math.round(Date.parse(timestamp) / 1000)}:R>`,
					} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
				},
			);
		}
		if (subcommand === "compare-ids")
			return reply({
				content: `Differenza di tempo tra i due ID: **${formatTime(idDiff(options.id2, options.id1))}**`,
			});
		return;
	}
	override component(
		{ reply, update }: ComponentReplies,
		{ args: [action], interaction, user: { id } }: ComponentArgs,
	) {
		if (action === "stop")
			if (interaction.message.interaction_metadata?.user.id === id)
				update({
					content: `Cronometro fermato dopo **${formatTime(idDiff(interaction.id, interaction.message.id))}**`,
					components: [],
				});
			else
				reply({
					content: "Non puoi gestire questo cronometro!",
					flags: MessageFlags.Ephemeral,
				});
	}
}
