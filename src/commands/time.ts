import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	type APIMessage,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { Temporal } from "temporal-polyfill";
import Command from "../Command";
import { rest } from "../util/globals";
import { timeout } from "../util/node";
import {
	formatDuration,
	idDiff,
	idToTimestamp,
	parseTimeValue,
} from "../util/time";

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
					{
						name: "tz",
						description:
							"Fuso orario per il formato lungo (default: Europe/Rome)",
						type: ApplicationCommandOptionType.String,
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
			options: { time1, time2, long, tz },
			interaction: { locale },
		}: ChatInputArgs<typeof Time.chatInputData, "compare">,
	) => {
		try {
			const start = Temporal.Instant.fromEpochMilliseconds(
				parseTimeValue(time1),
			);

			reply({
				content: `Differenza di tempo tra i due timestamp: **${
					formatDuration(
						start.until(
							time2 ?
								Temporal.Instant.fromEpochMilliseconds(parseTimeValue(time2))
							:	Temporal.Now.instant(),
						),
						{
							locales: locale,
							long,
							relativeTo:
								long || tz ?
									start.toZonedDateTimeISO(tz ?? "Europe/Rome")
								:	undefined,
							options: { fractionalDigits: 3 },
						},
					) || "⚡ nessuna differenza, più veloce di flash!"
				}**`,
			});
		} catch (err) {
			return reply({
				content: "Timestamp o fuso orario non validi!",
				flags: MessageFlags.Ephemeral,
			});
		}
	};
	static stop = (
		{ reply, update }: ComponentReplies,
		{ interaction, user: { id } }: ComponentArgs,
	) =>
		interaction.message.interaction_metadata?.user.id === id ?
			update({
				content: `Cronometro fermato dopo **${formatDuration(idDiff(interaction.message.id, interaction.id), { locales: interaction.locale, options: { fractionalDigits: 3 } })}**`,
				components: [],
			})
		:	reply({
				content: "Non puoi gestire questo cronometro!",
				flags: MessageFlags.Ephemeral,
			});
}
