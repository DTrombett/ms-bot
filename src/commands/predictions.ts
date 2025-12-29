import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	Routes,
	TextInputStyle,
	type APIModalInteractionResponseCallbackData,
	type ModalSubmitActionRowComponent,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import Command from "../Command.ts";
import { calculateWins } from "../util/calculateWins.ts";
import { MatchStatus } from "../util/Constants.ts";
import { getLiveEmbed, resolveStats } from "../util/getLiveEmbed.ts";
import { getMatchDayNumber } from "../util/getMatchDayNumber.ts";
import { getSeasonData } from "../util/getSeasonData.ts";
import { hashMatches } from "../util/hashMatches.ts";
import { loadMatches } from "../util/loadMatches.ts";
import { createMatchName } from "../util/normalizeTeamName.ts";
import { resolveLeaderboard } from "../util/resolveLeaderboard.ts";
import { rest } from "../util/rest.ts";
import { sortLeaderboard } from "../util/sortLeaderboard.ts";
import { TimeUnit } from "../util/time.ts";

export class Predictions extends Command {
	static override chatInputData = {
		name: "predictions",
		description:
			"Invia e modifica i tuoi pronostici calcistici per divertirti con i risultati sportivi",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				name: "send",
				description: "Invia i tuoi pronostici per la prossima giornata",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "OPZIONE PRIVATA",
					},
					{
						type: ApplicationCommandOptionType.Number,
						name: "day",
						description: "OPZIONE PRIVATA",
					},
				],
			},
			{
				name: "leaderboard",
				description: "Controlla la classifica generale attuale",
				type: ApplicationCommandOptionType.Subcommand,
			},
			{
				name: "view",
				description: "Visualizza i tuoi pronostici per la prossima giornata",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "OPZIONE PRIVATA",
					},
					{
						type: ApplicationCommandOptionType.Number,
						name: "day",
						description: "OPZIONE PRIVATA",
					},
				],
			},
			{
				name: "reminder",
				description:
					"Imposta un promemoria per ricordarti di inserire i pronostici",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "before",
						required: true,
						description:
							"Quanti minuti prima dell'inizio della giornata inviare il promemoria. Imposta 0 per eliminarlo",
					},
				],
			},
			{
				name: "dashboard",
				description: "Apri la dashboard web per inviare i pronostici",
				type: ApplicationCommandOptionType.Subcommand,
			},
		],
	} as const satisfies RESTPostAPIApplicationCommandsJSONBody;
	static override customId = "predictions";
	static predictionRegex =
		/^(1|x|2|1x|12|x2|((?<prediction>1|2|x)\s*\(\s*(?<first>\d+)\s*-\s*(?<second>\d+)\s*\)))$/;
	static predictionExamples = [
		"1",
		"X",
		"2",
		"1X",
		"12",
		"X2",
		"1 (1-0)",
		"1 (2-0)",
		"1 (2-1)",
		"1 (3-0)",
		"1 (3-1)",
		"1 (3-2)",
		"1 (4-0)",
		"1 (4-1)",
		"1 (4-2)",
		"1 (4-3)",
		"2 (0-1)",
		"2 (0-2)",
		"2 (1-2)",
		"2 (0-3)",
		"2 (1-3)",
		"2 (2-3)",
		"2 (0-4)",
		"2 (1-4)",
		"2 (2-4)",
		"2 (3-4)",
		"X (0-0)",
		"X (1-1)",
		"X (2-2)",
		"X (3-3)",
		"X (4-4)",
	];
	static reminder = async (
		{ reply }: ChatInputReplies,
		{
			user,
			options,
		}: ChatInputArgs<typeof Predictions.chatInputData, "reminder">,
	) => {
		await env.DB.prepare(
			`UPDATE Users SET remindMinutes = ?1, reminded = 0
				WHERE id = ?2`,
		)
			.bind(options.before || null, user.id)
			.run();
		reply({
			content: "Promemoria impostato correttamente!",
			flags: MessageFlags.Ephemeral,
		});
	};
	static dashboard = ({ reply }: ChatInputReplies) =>
		reply({
			content:
				"Apri la [dashboard](https://ms-bot.trombett.org/) per inviare i pronostici!",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Apri",
							url: "https://ms-bot.trombett.org/predictions",
						},
					],
				},
			],
		});
	static leaderboard = async ({ reply }: ChatInputReplies) => {
		const { results } = await env.DB.prepare(
			`SELECT id, dayPoints, matchPointsHistory, match
				FROM Users
				WHERE dayPoints IS NOT NULL`,
		).all<Pick<User, "dayPoints" | "id" | "matchPointsHistory" | "match">>();
		const wins = calculateWins(results);
		const sortedResults = sortLeaderboard(results);

		reply({
			embeds: [
				{
					thumbnail: {
						url: "https://img.legaseriea.it/vimages/6685b340/SerieA_ENILIVE_RGB.jpg",
					},
					title: "Classifica Generale",
					description: sortedResults
						.map(
							(user, i) =>
								`${i + 1}. <@${user.id}>: **${user.dayPoints ?? 0}** Punt${
									Math.abs(user.dayPoints ?? 0) === 1 ? "o" : "i"
								} Giornata (**${wins[user.id] ?? 0}** vittori${
									(wins[user.id] ?? 0) === 1 ? "a" : "e"
								})`,
						)
						.join("\n"),
					fields: [resolveStats(sortedResults)],
					author: {
						name: "Serie A Enilive",
						url: "https://legaseriea.it/it/serie-a",
					},
					color: 0x3498db,
				},
			],
		});
	};
	static override async chatInput(
		{ reply, modal }: ChatInputReplies,
		{
			interaction,
			user,
			subcommand,
			options,
		}: ChatInputArgs<typeof Predictions.chatInputData, "send" | "view">,
	) {
		if (options.user !== undefined || options.day !== undefined)
			if (!env.OWNER_ID.includes(user.id))
				return reply({
					flags: MessageFlags.Ephemeral,
					content: "Quest'opzione è privata!",
				});
		if (options.user)
			user = interaction.data.resolved?.users?.[options.user] ?? user;
		const [matchDay, matches, existingPredictions] = await getSeasonData(
			user.id,
			options.day,
		);

		if (!(matchDay as MatchDay | null))
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Non c'è nessuna giornata disponibile al momento!",
			});
		const startTime = Date.parse(matches[0]!.matchDateUtc) - 1_000 * 60 * 5;
		if (subcommand === "view") {
			if (!existingPredictions.length)
				return reply({
					content: "Non hai inviato alcun pronostico per la giornata!",
					flags: MessageFlags.Ephemeral,
				});
			return reply({
				embeds: [
					{
						author: {
							name: user.global_name ?? user.username,
							icon_url:
								user.avatar == null
									? rest.cdn.defaultAvatar(
											user.discriminator === "0"
												? Number(BigInt(user.id) >> 22n) % 6
												: Number(user.discriminator) % 5,
									  )
									: rest.cdn.avatar(user.id, user.avatar, {
											size: 4096,
											extension: "png",
									  }),
						},
						color: 0x3498db,
						fields: matches.map((m) => ({
							name: `${createMatchName(m)} (<t:${Math.round(
								Date.parse(m.matchDateUtc) / 1_000,
							)}:F>)`,
							value:
								(existingPredictions[0]?.match === m.matchId ? "⭐ " : "") +
								(existingPredictions.find(
									(predict) => predict.matchId === m.matchId,
								)?.prediction ?? "*Non presente*"),
						})),
						thumbnail: {
							url: "https://img.legaseriea.it/vimages/6685b340/SerieA_ENILIVE_RGB.jpg",
						},
						title: `${getMatchDayNumber(matchDay)}ª Giornata Serie A Enilive`,
						url: "https://legaseriea.it/it/serie-a",
					},
				],
				flags: MessageFlags.Ephemeral,
			});
		}
		if (subcommand === "send") {
			if (Date.now() >= startTime && !options.user && !options.day)
				return reply({
					content:
						"Puoi inviare i pronostici solo fino a 5 minuti dall'inizio del primo match della giornata!",
					flags: MessageFlags.Ephemeral,
				});
			return modal(
				this.buildModal(
					matches,
					matchDay,
					1,
					user.id,
					existingPredictions,
					options.user ? Infinity : undefined,
				),
			);
		}
	}
	static override async modal(
		{ reply }: ModalReplies,
		{
			interaction,
			user: { id },
			args: [dayArg, partArg, timestampArg, userId = id],
		}: ModalArgs,
	) {
		const [day, part, timestamp] = [dayArg, partArg, timestampArg].map(Number);

		if (Date.now() >= timestamp!)
			return reply({
				content:
					"Puoi inviare i pronostici solo fino a 5 minuti dall'inizio del primo match della giornata!",
				flags: MessageFlags.Ephemeral,
			});
		const [matchDay, matches, existingPredictions] = await getSeasonData(
			userId,
			day,
		);
		if (!(matchDay as MatchDay | null))
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Non c'è nessuna giornata disponibile al momento!",
			});
		const total = matches.length / 5;
		const invalid: string[] = [];
		const resolved: Record<string, string | undefined> = {};
		const newPredictions: Prediction[] = [];
		for (const {
			components: [field],
		} of interaction.data.components as ModalSubmitActionRowComponent[]) {
			const value = field!.value.trim();
			const match = value.toLowerCase().match(Predictions.predictionRegex);
			const matchId = field!.custom_id;

			if (
				!match?.groups ||
				(match[0].startsWith("x") &&
					match.groups.first !== match.groups.second) ||
				(match[0].startsWith("1") &&
					match.groups.first &&
					match.groups.first <= match.groups.second!) ||
				(match[0].startsWith("2") &&
					match.groups.first &&
					match.groups.first >= match.groups.second!) ||
				(match.groups.first && Number(match.groups.first) > 999) ||
				(match.groups.second && Number(match.groups.second) > 999)
			) {
				const invalidMatch = matches.find((m) => m.matchId === matchId);

				if (invalidMatch) invalid.push(createMatchName(invalidMatch));
			} else if (
				existingPredictions.find((p) => p.matchId === matchId)?.prediction !==
				(resolved[field!.value] ??= match.groups.prediction
					? `${match.groups.prediction.toUpperCase()} (${
							match.groups.first
					  } - ${match.groups.second})`
					: value.toUpperCase())
			)
				newPredictions.push({
					matchId,
					userId,
					prediction: resolved[field!.value]!,
				});
		}
		if (newPredictions.length) {
			const predictionsQuery = env.DB.prepare(
				`INSERT OR REPLACE INTO Predictions (matchId, userId, prediction) VALUES ${"\n(?, ?, ?),".repeat(
					newPredictions.length,
				)}`.slice(0, -1),
			).bind(
				...newPredictions.flatMap((m) => [m.matchId, userId, m.prediction]),
			);

			if (existingPredictions.length) await predictionsQuery.run();
			else
				await env.DB.batch([
					env.DB.prepare(
						`INSERT
						OR IGNORE INTO Users(id)
					VALUES (?)`,
					).bind(userId),
					predictionsQuery,
				]);
		}
		if (invalid.length)
			return reply({
				content: `I pronostici inviati nei seguenti risultati non sono validi: ${invalid
					.map((text) => `**${text}**`)
					.join(", ")}`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `predictions-${getMatchDayNumber(
									matchDay,
								)}-${part}-${timestamp}-${userId}`,
								emoji: { name: "✏️" },
								label: "Modifica",
								style: ButtonStyle.Danger,
							},
						],
					},
				],
				flags: MessageFlags.Ephemeral,
			});
		if (part === total)
			return reply({
				content: `Parte **${part} di ${total}** inviata correttamente!\nSeleziona il **Match of the Match** dal menù qui sotto`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.StringSelect,
								custom_id: `predictions-match-${day}-${timestamp}-${userId}`,
								placeholder: "Seleziona il Match of the Match",
								options: matches.map((m) => ({
									label: createMatchName(m),
									description:
										(
											newPredictions.find(
												({ matchId }) => matchId === m.matchId,
											) ??
											existingPredictions.find(
												({ matchId }) => matchId === m.matchId,
											)
										)?.prediction ?? "",
									value: m.matchId,
									default: m.matchId === existingPredictions[0]?.match,
								})),
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `predictions-${getMatchDayNumber(
									matchDay,
								)}-1-${timestamp}-${userId}`,
								emoji: { name: "✏️" },
								label: "Modifica",
								style: ButtonStyle.Success,
							},
						],
					},
				],
				flags: MessageFlags.Ephemeral,
			});
		reply({
			content: `Parte **${part} di ${total}** inviata correttamente! Clicca il pulsante per continuare...`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `predictions-${getMatchDayNumber(matchDay)}-${
								part! + 1
							}-${timestamp}-${userId}`,
							emoji: { name: "⏩" },
							label: "Continua",
							style: ButtonStyle.Primary,
						},
					],
				},
			],
			flags: MessageFlags.Ephemeral,
		});
	}
	static override async component(
		{ reply, modal, deferUpdate, edit }: ComponentReplies,
		{
			interaction,
			user: { id },
			args: [actionOrDay, arg1, arg2, arg3 = id],
		}: ComponentArgs,
	) {
		if (actionOrDay === "r") {
			const nextUpdate =
				Number(arg3) ||
				Date.parse(
					interaction.message.edited_timestamp ?? interaction.message.timestamp,
				) +
					TimeUnit.Minute * 5;
			const now = Date.now();
			if (nextUpdate > now)
				return reply({
					flags: MessageFlags.Ephemeral,
					content: `Puoi aggiornare nuovamente i dati <t:${Math.round(
						nextUpdate / 1000,
					)}:R>!`,
				});
			deferUpdate();
			const matches = await loadMatches(arg1!);
			const hash = hashMatches(matches);

			if (hash === arg2) return;
			const [{ results: predictions }, { results: rawUsers }] =
				(await env.DB.batch([
					env.DB.prepare(
						`SELECT *
					FROM Predictions
					WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
					).bind(...matches.map((m) => m.matchId)),
					env.DB.prepare(`SELECT id, dayPoints, matchPointsHistory, match
					FROM Users`),
				])) as [
					D1Result<Prediction>,
					D1Result<
						Pick<User, "dayPoints" | "id" | "match" | "matchPointsHistory">
					>,
				];
			let users: ResolvedUser[] = rawUsers
				.map((user) => ({
					...user,
					predictions: predictions.filter((p) => p.userId === user.id),
				}))
				.filter((u) => u.predictions.length || u.dayPoints != null);
			const nextMatch = matches.some(
				(m) => m.providerStatus === MatchStatus.Live,
			)
				? now + TimeUnit.Minute
				: matches.every((m) => m.providerStatus === MatchStatus.Finished)
				? 0
				: Date.parse(
						matches.find((m) => m.providerStatus === MatchStatus.ToBePlayed)
							?.matchDateUtc ?? "",
				  ) || TimeUnit.Day;
			const leaderboard = resolveLeaderboard(users, matches);
			const day = getMatchDayNumber(matches[0]!.matchSet);
			if (!nextMatch) {
				const query = env.DB.prepare(`UPDATE Users
				SET dayPoints = COALESCE(dayPoints, 0) + ?1,
					matchPointsHistory = COALESCE(matchPointsHistory, "${",".repeat(
						Math.max(day - 2, 0),
					)}") || ?2,
					reminded = 0,
					match = NULL
				WHERE id = ?3`);

				users = [];
				await env.DB.batch([
					...leaderboard.map(([user, matchPoints, dayPoints]) => {
						users.push({
							...user,
							dayPoints: (user.dayPoints ?? 0) + dayPoints,
							matchPointsHistory: `${
								user.matchPointsHistory ?? ",".repeat(Math.max(day - 2, 0))
							},${matchPoints}`,
							match: null,
						});
						return query.bind(dayPoints, `,${matchPoints}`, user.id);
					}),
					env.DB.prepare(
						`DELETE FROM Predictions
					WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
					).bind(...matches.map((m) => m.matchId)),
				]);
			}
			await edit({
				embeds: getLiveEmbed(users, matches, leaderboard, day, !nextMatch),
				components: nextMatch
					? [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										custom_id: `predictions-r-${arg1}-${hash}-${nextMatch}`,
										emoji: { name: "🔁" },
										label: "Aggiorna",
										style: ButtonStyle.Primary,
									},
								],
							},
					  ]
					: [],
			});
			if (!nextMatch)
				await rest.delete(
					Routes.channelMessagesPin(
						env.PREDICTIONS_CHANNEL,
						interaction.message.id,
					),
				);
		}
		const time = parseInt(arg2!);
		if (Date.now() >= time)
			return reply({
				content:
					"Puoi modificare i pronostici solo fino a 5 minuti dall'inizio del primo match della giornata!",
				flags: MessageFlags.Ephemeral,
			});
		const [matchDay, matches, existingPredictions] = await getSeasonData(
			arg3,
			Number(actionOrDay) || Number(arg1) || undefined,
		);

		if (!(matchDay as MatchDay | null))
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Non c'è nessuna giornata disponibile al momento!",
			});
		if (actionOrDay === "match") {
			if (interaction.data.component_type !== ComponentType.StringSelect)
				return;
			if (!interaction.data.values.length)
				return reply({
					content: "Non hai selezionato alcun match!",
					flags: MessageFlags.Ephemeral,
				});
			await env.DB.prepare(
				`UPDATE Users
				SET match = ?1
				WHERE id = ?2;`,
			)
				.bind(interaction.data.values[0], arg3)
				.run();
			return reply({
				content: "Pronostici inviati correttamente!",
				flags: MessageFlags.Ephemeral,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `predictions-${getMatchDayNumber(
									matchDay,
								)}-1-${arg2}-${arg3}`,
								emoji: { name: "✏️" },
								label: "Modifica",
								style: ButtonStyle.Success,
							},
						],
					},
				],
			});
		}
		if (parseInt(actionOrDay!) !== getMatchDayNumber(matchDay))
			return reply({
				content: "Questi pronostici sono scaduti!",
				flags: MessageFlags.Ephemeral,
			});
		modal(
			this.buildModal(
				matches,
				matchDay,
				parseInt(arg1!),
				arg3,
				existingPredictions,
				time,
			),
		);
	}
	static buildModal = (
		matches: Match[],
		matchDay: MatchDay,
		part: number,
		userId: string,
		predictions?: Pick<Prediction, "matchId" | "prediction">[],
		timestamp = Date.parse(matches[0]!.matchDateUtc) - 1_000 * 60 * 5,
	): APIModalInteractionResponseCallbackData => ({
		title: `Pronostici ${getMatchDayNumber(matchDay)}ª Giornata (${part}/${
			matches.length / 5
		})`,
		custom_id: `predictions-${getMatchDayNumber(
			matchDay,
		)}-${part}-${timestamp}-${userId}`,
		components: matches.slice((part - 1) * 5, part * 5).map((m) => ({
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.TextInput,
					custom_id: m.matchId,
					label: createMatchName(m),
					style: TextInputStyle.Short,
					required: true,
					placeholder: `es. ${
						Predictions.predictionExamples[
							Math.floor(Math.random() * Predictions.predictionExamples.length)
						]
					}`,
					value: predictions?.find(
						(prediction) => prediction.matchId === m.matchId,
					)?.prediction,
				},
			],
		})),
	});
}
