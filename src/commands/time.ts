import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	type APIMessage,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { timeout } from "../util/node.ts";
import { rest } from "../util/rest.ts";
import { formatTime, idDiff } from "../util/time.ts";

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
	static override supportComponentMethods = true;
	static stopwatch = async (
		{ reply }: ChatInputReplies,
		{
			interaction: { application_id, token },
		}: ChatInputArgs<typeof Time.chatInputData, "stopwatch">,
	) => {
		const fullRoute = Routes.webhookMessage(application_id, token);

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
		// Wait for next tick
		await timeout();
		return rest.patch(fullRoute, {
			body: {
				content: `Cronometro avviato <t:${Math.round(Date.parse(((await rest.get(fullRoute)) as APIMessage).timestamp) / 1000)}:R>`,
			} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
		});
	};
	static "compare-ids" = (
		{ reply }: ChatInputReplies,
		{
			options: { id1, id2 },
		}: ChatInputArgs<typeof Time.chatInputData, "compare-ids">,
	) =>
		reply({
			content: `Differenza di tempo tra i due ID: **${formatTime(idDiff(id2, id1))}**`,
		});
	static stop = (
		{ reply, update }: ComponentReplies,
		{ interaction, user: { id } }: ComponentArgs,
	) =>
		interaction.message.interaction_metadata?.user.id === id
			? update({
					content: `Cronometro fermato dopo **${formatTime(idDiff(interaction.id, interaction.message.id))}**`,
					components: [],
				})
			: reply({
					content: "Non puoi gestire questo cronometro!",
					flags: MessageFlags.Ephemeral,
				});
}
