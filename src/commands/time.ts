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
	parseDuration,
	parseTimeValue,
} from "../util/time";

export class Time extends Command {
	static override chatInputData = {
		name: "time",
		description: "Vari comandi per gestire il tempo",
		type: ApplicationCommandType.ChatInput,
		options: [
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
			{
				name: "stamp",
				description: "Crea una timestamp Discord da un tempo qualsiasi",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "time",
						description:
							"Un tempo relativo o assoluto (es. 2d, 10/05/26, 13:00)",
						type: ApplicationCommandOptionType.String,
						required: true,
					},
					{
						name: "tz",
						description:
							"Il fuso orario in cui interpretare il tempo (default Europe/Rome)",
						type: ApplicationCommandOptionType.String,
					},
				],
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
				name: "stopwatch",
				description: "Fai partire il cronometro!",
				type: ApplicationCommandOptionType.Subcommand,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override supportComponentMethods = true;
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
	static stamp = (
		{ reply }: ChatInputReplies,
		{
			options: { time, tz },
			interaction: { id: interactionId },
		}: ChatInputArgs<typeof Time.chatInputData, "stamp">,
	) => {
		let start;
		try {
			start = Temporal.Instant.fromEpochMilliseconds(
				idToTimestamp(interactionId),
			).toZonedDateTimeISO(tz ?? "Europe/Rome");
		} catch (err) {
			return reply({
				content: "Il fuso orario inserito non è valido!",
				flags: MessageFlags.Ephemeral,
			});
		}
		const target = parseDuration(time, start);

		if (!target)
			return reply({
				content: "Il tempo inserito non è valido!",
				flags: MessageFlags.Ephemeral,
			});
		const timestamp = Math.floor(target.epochMilliseconds / 1000);
		reply({
			content: ["t", "T", "d", "D", "f", "F", "s", "S", "R"]
				.map((s) => `\`<t:${timestamp}:${s}>\`\t<t:${timestamp}:${s}>`)
				.join("\n"),
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
