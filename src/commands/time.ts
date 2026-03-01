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
import { rest } from "../util/globals.ts";
import { timeout } from "../util/node.ts";
import {
	formatLongTime,
	formatTime,
	idDiff,
	idToTimestamp,
	parseTimeValue,
} from "../util/time.ts";

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
				name: "resolve-id",
				description: "Risolvi un ID Discord in un timestamp",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "id",
						description: "ID Discord",
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
						description: "Secondo timestamp (default: adesso)",
						type: ApplicationCommandOptionType.String,
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
	static "resolve-id" = (
		{ reply }: ChatInputReplies,
		{ options: { id } }: ChatInputArgs<typeof Time.chatInputData, "resolve-id">,
	) => {
		try {
			const timestamp = idToTimestamp(id);
			const timestampSeconds = Math.round(timestamp / 1000);

			reply({
				content: `Timestamp: \`${timestamp}\`, <t:${timestampSeconds}:f>, <t:${timestampSeconds}:R>\n`,
			});
		} catch {
			reply({ content: "ID non valido!", flags: MessageFlags.Ephemeral });
		}
	};
	static compare = (
		{ reply }: ChatInputReplies,
		{
			options: { time1, time2, long },
		}: ChatInputArgs<typeof Time.chatInputData, "compare">,
	) => {
		const diff = Math.abs(
			parseTimeValue(time1) - (time2 ? parseTimeValue(time2) : Date.now()),
		);

		if (Number.isNaN(diff))
			return reply({
				content: "Timestamp non validi!",
				flags: MessageFlags.Ephemeral,
			});
		reply({
			content: `Differenza di tempo tra i due timestamp: **${long ? formatLongTime(diff) : formatTime(diff)}**`,
		});
	};
	static stop = (
		{ reply, update }: ComponentReplies,
		{ interaction, user: { id } }: ComponentArgs,
	) =>
		interaction.message.interaction_metadata?.user.id === id ?
			update({
				content: `Cronometro fermato dopo **${formatTime(idDiff(interaction.id, interaction.message.id))}**`,
				components: [],
			})
		:	reply({
				content: "Non puoi gestire questo cronometro!",
				flags: MessageFlags.Ephemeral,
			});
}
