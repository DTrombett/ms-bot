import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIMessage,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { timeout } from "../util/node.ts";
import { rest } from "../util/rest.ts";
import { formatLongTime, formatTime, idDiff, parseTimeValue } from "../util/time.ts";

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
			{
				name: "compare",
				description: "Calcola la differenza tra due timestamp",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "time1",
						description: "Primo timestamp",
						type: ApplicationCommandOptionType.String,
						required: true,
					},
					{
						name: "time2",
						description: "Secondo timestamp",
						type: ApplicationCommandOptionType.String,
						required: true,
					},
					{
						name: "long",
						description: "Usa un formato più lungo",
						type: ApplicationCommandOptionType.Boolean,
					},
				],
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "time";
	static override supportComponentMethods = true;
	static stopwatch = async (
		{ reply, edit }: ChatInputReplies,
		{ fullRoute }: ChatInputArgs<typeof Time.chatInputData, "stopwatch">,
	) => {
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
		return edit({
			content: `Cronometro avviato <t:${Math.round(Date.parse(((await rest.get(fullRoute)) as APIMessage).timestamp) / 1000)}:R>`,
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
	static compare = (
		{ reply }: ChatInputReplies,
		{
			options: { time1, time2, long },
		}: ChatInputArgs<typeof Time.chatInputData, "compare">,
	) => {
		const timestamp1 = parseTimeValue(time1);
		const timestamp2 = parseTimeValue(time2);

		if (timestamp1 === -1 || timestamp2 === -1)
			return reply({
				content: "Uno o entrambi i timestamp forniti non sono validi!",
				flags: MessageFlags.Ephemeral,
			});
		return reply({
			content: `Differenza di tempo tra i due timestamp: **${long ? formatLongTime(Math.abs(timestamp2 - timestamp1)) : formatTime(Math.abs(timestamp2 - timestamp1))}**`,
		});
	};
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
