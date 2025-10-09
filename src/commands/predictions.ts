import { env } from "cloudflare:workers";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageFlags,
	TextInputStyle,
	type APIModalInteractionResponseCallbackData,
	type ModalSubmitActionRowComponent,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
	Command,
	MatchDay,
	Prediction,
	calculateWins,
	getMatchDayData,
	getMatchDayNumber,
	normalizeTeamName,
	rest,
	sortLeaderboard,
	type ChatInputArgs,
	type ChatInputReplies,
	type ComponentArgs,
	type ComponentReplies,
	type Match,
	type ModalArgs,
	type ModalReplies,
	type User,
} from "../util";
import { resolveStats } from "../util/getLiveEmbed";

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
	override async chatInput(
		{ reply, modal }: ChatInputReplies,
		{
			interaction,
			user: { id: userId },
			...args
		}: ChatInputArgs<typeof Predictions.chatInputData>,
	) {
		if (args.subcommand === "reminder") {
			if (typeof args.options.before !== "number") return;
			await env.DB.prepare(
				`UPDATE Users SET remindMinutes = ?1, reminded = 0 WHERE id = ?2`,
			)
				.bind(args.options.before || null, userId)
				.run();
			return reply({
				content: "Promemoria impostato correttamente!",
				flags: MessageFlags.Ephemeral,
			});
		}
		if (args.subcommand === "dashboard")
			return reply({
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
		if (args.subcommand === "leaderboard") {
			const { results } = await env.DB.prepare(
				`SELECT id, dayPoints, matchPointsHistory, match
					FROM Users
					WHERE dayPoints IS NOT NULL`,
			).all<Pick<User, "dayPoints" | "id" | "matchPointsHistory">>();
			const wins = calculateWins(results);
			const sortedResults = sortLeaderboard(results);

			return reply({
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
		}
		if (args.options.user !== undefined || args.options.day !== undefined)
			if (!env.OWNER_ID.includes(userId))
				return reply({
					flags: MessageFlags.Ephemeral,
					content: "Quest'opzione è privata!",
				});
		if (args.options.user) userId = args.options.user;
		const [matchDay, matches, existingPredictions] = await getMatchDayData(
			userId,
			args.options.day,
		);

		if (!(matchDay as MatchDay | null))
			return reply({
				flags: MessageFlags.Ephemeral,
				content: "Non c'è nessuna giornata disponibile al momento!",
			});
		const startTime = Date.parse(matches[0]!.date_time) - 1_000 * 60 * 5;

		if (args.subcommand === "view") {
			const user =
				interaction.data.resolved?.users?.[userId] ??
				(interaction.member ?? interaction).user!;

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
							name: `${[m.home_team_name, m.away_team_name]
								.map(normalizeTeamName)
								.join(" - ")} (<t:${Math.round(
								new Date(m.date_time).getTime() / 1_000,
							)}:F>)`,
							value:
								(existingPredictions[0]?.match === m.match_id ? "⭐ " : "") +
								(existingPredictions.find(
									(predict) => predict.matchId === m.match_id,
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
		if (Date.now() >= startTime && !args.options.user && !args.options.day)
			return reply({
				content:
					"Puoi inviare i pronostici solo fino a 5 minuti dall'inizio del primo match della giornata!",
				flags: MessageFlags.Ephemeral,
			});
		if (
			args.subcommand === "send" &&
			existingPredictions.length === matches.length
		) {
			return reply({
				content:
					"Hai già inviato i pronostici per questa giornata! Clicca il pulsante se vuoi modificarli.",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `predictions-${getMatchDayNumber(matchDay)}-1-${
									args.options.user ? Infinity : startTime
								}-${userId}`,
								emoji: { name: "✏️" },
								label: "Modifica",
								style: ButtonStyle.Success,
							},
						],
					},
				],
				flags: MessageFlags.Ephemeral,
			});
		}
		modal(
			this.buildModal(
				matches,
				matchDay,
				1,
				userId,
				existingPredictions,
				args.options.user ? Infinity : undefined,
			),
		);
	}
	override async modal(
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
		const [matchDay, matches, existingPredictions] = await getMatchDayData(
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
			const matchId = parseInt(field!.custom_id);

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
			)
				invalid.push(matches.find((m) => m.match_id === matchId)!.match_name);
			else if (
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
								custom_id: `predictions-${getMatchDayNumber(matchDay)}-${part}-${timestamp}-${userId}`,
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
									label: [m.home_team_name, m.away_team_name]
										.map(normalizeTeamName)
										.join(" - "),
									description:
										(
											newPredictions.find(
												({ matchId }) => matchId === m.match_id,
											) ??
											existingPredictions.find(
												({ matchId }) => matchId === m.match_id,
											)
										)?.prediction ?? "",
									value: m.match_id.toString(),
									default: m.match_id === existingPredictions[0]?.match,
								})),
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								custom_id: `predictions-${getMatchDayNumber(matchDay)}-1-${timestamp}-${userId}`,
								emoji: { name: "✏️" },
								label: "Modifica",
								style: ButtonStyle.Success,
							},
						],
					},
				],
				flags: MessageFlags.Ephemeral,
			});
		return reply({
			content: `Parte **${part} di ${total}** inviata correttamente! Clicca il pulsante per continuare...`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							custom_id: `predictions-${getMatchDayNumber(matchDay)}-${part! + 1}-${timestamp}-${userId}`,
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
	override async component(
		{ reply, modal }: ComponentReplies,
		{
			interaction,
			user: { id },
			args: [actionOrDay, part, timestamp, userId = id],
		}: ComponentArgs,
	) {
		const time = parseInt(timestamp!);

		if (Date.now() >= time)
			return reply({
				content:
					"Puoi modificare i pronostici solo fino a 5 minuti dall'inizio del primo match della giornata!",
				flags: MessageFlags.Ephemeral,
			});
		const [matchDay, matches, existingPredictions] = await getMatchDayData(
			userId,
			Number(actionOrDay) || Number(part) || undefined,
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
				.bind(interaction.data.values[0], userId)
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
								custom_id: `predictions-${getMatchDayNumber(matchDay)}-1-${timestamp}-${userId}`,
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
		return modal(
			this.buildModal(
				matches,
				matchDay,
				parseInt(part!),
				userId,
				existingPredictions,
				time,
			),
		);
	}
	buildModal(
		matches: Match[],
		matchDay: MatchDay,
		part: number,
		userId: string,
		predictions?: Pick<Prediction, "matchId" | "prediction">[],
		timestamp = Date.parse(matches[0]!.date_time) - 1_000 * 60 * 5,
	): APIModalInteractionResponseCallbackData {
		return {
			title: `Pronostici ${getMatchDayNumber(matchDay)}ª Giornata (${part}/${matches.length / 5})`,
			custom_id: `predictions-${getMatchDayNumber(matchDay)}-${part}-${timestamp}-${userId}`,
			components: matches.slice((part - 1) * 5, part * 5).map((m) => ({
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						custom_id: m.match_id.toString(),
						label: [m.home_team_name, m.away_team_name]
							.map(normalizeTeamName)
							.join(" - "),
						style: TextInputStyle.Short,
						required: true,
						placeholder: `es. ${Predictions.predictionExamples[Math.floor(Math.random() * Predictions.predictionExamples.length)]}`,
						value: predictions?.find(
							(prediction) => prediction.matchId === m.match_id,
						)?.prediction,
					},
				],
			})),
		};
	}
}
