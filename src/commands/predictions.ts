import {
	ActionRowBuilder,
	ButtonBuilder,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
} from "@discordjs/builders";
import {
	APIApplicationCommandInteractionDataSubcommandOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	InteractionResponseType,
	MessageFlags,
	TextInputStyle,
} from "discord-api-types/v10";
import {
	Match,
	MatchDay,
	Prediction,
	capitalize,
	closeMatchDay,
	createCommand,
	getLiveEmbed,
	prepareMatchDayData,
	resolveLeaderboard,
	startPredictions,
} from "../util";

const predictionExamples = [
	"1",
	"X",
	"2",
	"1X",
	"12",
	"X2",
	"1 (1-0)",
	"1 (2-1)",
	"2 (0-1)",
	"2 (1-2)",
	"X (0-0)",
	"X (1-1)",
];
const predictionRegex =
	/^(1|x|2|1x|12|x2|((?<prediction>1|2|x)\s*\(\s*(?<first>\d+)\s*-\s*(?<second>\d+)\s*\)))$/;
const buildModal = (
	matches: (Match & MatchDay)[],
	part: number,
	predictions?: Prediction[],
) =>
	new ModalBuilder()
		.setCustomId(
			`predictions-${matches[0]!.day}-${part}-${
				new Date(matches[0]!.startDate).getTime() - 1_000 * 60 * 15
			}`,
		)
		.setTitle(
			`Pronostici ${matches[0]!.day}ª Giornata (${part}/${matches.length / 5})`,
		)
		.addComponents(
			matches.slice((part - 1) * 5, part * 5).map((match) => {
				const textInput = new TextInputBuilder()
					.setCustomId(match.id.toString())
					.setLabel(match.teams)
					.setStyle(TextInputStyle.Short)
					.setRequired(true)
					.setPlaceholder(
						`es. ${
							predictionExamples[
								Math.floor(Math.random() * predictionExamples.length)
							]
						}`,
					);
				const found = predictions?.find(
					(prediction) => prediction.matchId === match.id,
				);

				if (found) textInput.setValue(found.prediction);
				return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
					textInput,
				);
			}),
		);

export const predictions = createCommand({
	data: [
		{
			name: "predictions",
			description:
				"Invia e modifica i tuoi pronostici calcistici per divertirti con i risultati sportivi",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "send",
					description: "Invia i tuoi pronostici per la prossima giornata",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "edit",
					description: "Modifica i tuoi pronostici per la prossima giornata",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "view",
					description:
						"Visualizza i tuoi pronostici o quelli di un altro utente",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							type: ApplicationCommandOptionType.User,
							name: "user",
							description: "L'utente di cui vedere i pronostici",
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
							type: ApplicationCommandOptionType.String,
							name: "before",
							required: true,
							description:
								"Quanto tempo prima dell'inizio della giornata inviare il promemoria. Imposta 0 per eliminarlo",
						},
					],
				},
			],
		},
	],
	async run(interaction, { reply, env }) {
		const subCommand = interaction.data.options!.find(
			(o): o is APIApplicationCommandInteractionDataSubcommandOption =>
				o.type === ApplicationCommandOptionType.Subcommand,
		)!;
		const options: Record<string, boolean | number | string> = {};

		if (subCommand.options)
			for (const option of subCommand.options)
				options[option.name] = option.value;
		const userId = options.user as string | undefined;
		const [{ results: matches }, { results: existingPredictions }] =
			(await env.DB.batch([
				env.DB.prepare(
					`SELECT *
FROM Matches
	JOIN MatchDays ON Matches.day = MatchDays.day
WHERE Matches.day = (
		SELECT MAX(day)
		FROM MatchDays
	)
ORDER BY matchDate`,
				),
				env.DB.prepare(
					`SELECT Predictions.*
				FROM Predictions
				JOIN Users ON Predictions.userId = Users.id
				WHERE Users.id = ?`,
				).bind(userId ?? (interaction.member ?? interaction).user!.id),
			])) as [D1Result<Match & MatchDay>, D1Result<Prediction>];

		if (subCommand.name === "reminder") {
			// 	const before = ms(interaction.options.getString("before", true));
			// 	const user =
			// 		(await User.findById(interaction.user.id)) ??
			// 		new User({ _id: interaction.user.id });
			// 	const existing = Object.values(timeoutCache).find(
			// 		(t) =>
			// 			t?.action === "predictionRemind" &&
			// 			t.options[0] === interaction.user.id,
			// 	);

			// 	if (before === 0) {
			// 		if (user.predictionReminder == null) {
			// 			await interaction.reply({
			// 				ephemeral: true,
			// 				content: "Non hai impostato alcun promemoria!",
			// 			});
			// 			return;
			// 		}
			// 		user.predictionReminder = undefined;
			// 		await Promise.all([
			// 			user.save(),
			// 			existing && removePermanentTimeout(existing.id),
			// 		]);
			// 		await interaction.reply({
			// 			ephemeral: true,
			// 			content: "Promemoria rimosso con successo!",
			// 		});
			// 		return;
			// 	}
			// 	if (Number.isNaN(before) || before < 1_000 || before > 604_800_000) {
			// 		await interaction.reply({
			// 			ephemeral: true,
			// 			content:
			// 				"Durata non valida! Imposta il promemoria almeno a un secondo e al massimo una settimana dall'inizio della giornata.",
			// 		});
			// 		return;
			// 	}
			// 	user.predictionReminder = before;
			// 	const promises: unknown[] = [
			// 		user.save(),
			// 		existing && removePermanentTimeout(existing.id),
			// 	];

			// 	if (matchDay?.predictionsSent === false) {
			// 		const date = matchDay.matches[0].date - 1000 * 60 * 15 - before;

			// 		if (date - Date.now() > 1_000)
			// 			promises.push(
			// 				setPermanentTimeout(this.client, {
			// 					action: "predictionRemind",
			// 					date,
			// 					options: [interaction.user.id],
			// 				}),
			// 			);
			// 	}
			// 	await Promise.all(promises);
			// 	await interaction.reply({
			// 		ephemeral: true,
			// 		content: "Promemoria impostato con successo!",
			// 	});
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Questo comando non è ancora disponibile :(" },
			});
			return;
		}
		const startTime =
			new Date(matches[0]!.startDate).getTime() - 1000 * 60 * 15;

		if (subCommand.name === "view") {
			if (!matches.length) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non c'è alcun pronostico da visualizzare al momento!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				userId &&
				userId !== (interaction.member ?? interaction).user!.id &&
				Date.now() < startTime
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Non puoi vedere i pronostici degli altri utenti prima dell'inizio della giornata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const user = userId
				? interaction.data.resolved!.users![userId]!
				: (interaction.member ?? interaction).user!;

			if (!existingPredictions.length) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"L'utente non ha inviato alcun pronostico per la giornata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: [
						{
							author: {
								name: user.global_name ?? user.username,
								icon_url:
									user.avatar == null
										? this.api.cdn.defaultAvatar(
												user.discriminator === "0"
													? Number(BigInt(user.id) >> 22n) % 6
													: Number(user.discriminator) % 5,
											)
										: this.api.cdn.avatar(user.id, user.avatar, {
												size: 4096,
												extension: "png",
											}),
							},
							color: 0x3498db,
							fields: matches.map((match) => ({
								name: `${match.teams} (<t:${Math.round(
									new Date(match.matchDate).getTime() / 1000,
								)}:F>)`,
								value:
									existingPredictions.find(
										(predict) => predict.matchId === match.id,
									)?.prediction ?? "*Non presente*",
							})),
							thumbnail: {
								url: "https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
							},
							title: `${matches[0]!.day}ª Giornata Serie A TIM`,
							url: "https://legaseriea.it/it/serie-a",
						},
					],
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (!matches.length) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Non c'è alcun pronostico da inviare al momento!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (Date.now() >= startTime) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						"Puoi inviare i pronostici solo fino a 15 minuti dall'inizio del primo match della giornata!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (
			subCommand.name === "send" &&
			existingPredictions.length === matches.length
		) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						"Hai già inviato i pronostici per questa giornata! Clicca il pulsante se vuoi modificarli...",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`predictions-${matches[0]!.day}-1-${startTime}`)
									.setEmoji({ name: "✏️" })
									.setLabel("Modifica")
									.setStyle(ButtonStyle.Success),
							)
							.toJSON(),
					],
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		reply({
			type: InteractionResponseType.Modal,
			data: buildModal(matches, 1, existingPredictions).toJSON(),
		});
	},
	async modalSubmit(interaction, { reply, env }) {
		const [, day, part, timestamp] = interaction.data.custom_id
			.split("-")
			.map((n) => Number(n));

		if (Date.now() >= timestamp!) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						"Puoi inviare i pronostici solo fino a 15 minuti dall'inizio del primo match della giornata!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const userId = (interaction.member ?? interaction).user!.id;
		const [{ results: matches }, { results: existingPredictions }] =
			(await env.DB.batch([
				env.DB.prepare(
					`SELECT *
FROM Matches
	JOIN MatchDays ON Matches.day = MatchDays.day
WHERE Matches.day = (
		SELECT MAX(day)
		FROM MatchDays
	)
ORDER BY matchDate`,
				),
				env.DB.prepare(
					`SELECT Predictions.*
				FROM Predictions
				JOIN Users ON Predictions.userId = Users.id
				WHERE Users.id = ?`,
				).bind(userId),
			])) as [D1Result<Match & MatchDay>, D1Result<Prediction>];

		if (!matches.length) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Non c'è alcun pronostico da inviare al momento!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const total = matches.length / 5;

		if (day !== matches[0]!.day) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questi pronostici sono scaduti!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const invalid: string[] = [];
		const resolved: Record<string, string | undefined> = {};
		const newPredictions: Prediction[] = [];

		for (const {
			components: [field],
		} of interaction.data.components) {
			const value = field!.value.trim();
			const match = value.toLowerCase().match(predictionRegex);
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
				invalid.push(
					matches
						.find((m) => m.id === matchId)!
						.teams.split("-")
						.map((team) =>
							team
								.split(" ")
								.map((word) => capitalize(word))
								.join(" "),
						)
						.join(" - "),
				);
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
		if (newPredictions.length)
			await env.DB.batch([
				env.DB.prepare(
					`INSERT
	OR IGNORE INTO Users(id)
VALUES (?)`,
				).bind(userId),
				env.DB.prepare(
					`INSERT INTO Predictions (matchId, userId, prediction) VALUES ${"\n(?, ?, ?),".repeat(
						newPredictions.length,
					)}`.slice(0, -1),
				).bind(
					...newPredictions.flatMap((m) => [m.matchId, userId, m.prediction]),
				),
			]);
		if (invalid.length) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `I pronostici inviati nei seguenti risultati non sono validi: ${invalid
						.map((text) => `**${text}**`)
						.join(", ")}`,
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(
										`predictions-${matches[0]!.day}-${part}-${timestamp}`,
									)
									.setEmoji({ name: "✏️" })
									.setLabel("Modifica")
									.setStyle(ButtonStyle.Danger),
							)
							.toJSON(),
					],
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (part === total)
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Pronostici inviati correttamente!",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`predictions-${matches[0]!.day}-1-${timestamp}`)
									.setEmoji({ name: "✏️" })
									.setLabel("Modifica")
									.setStyle(ButtonStyle.Success),
							)
							.toJSON(),
					],
					flags: MessageFlags.Ephemeral,
				},
			});
		else
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `Parte **${part} di ${total}** inviata correttamente! Clicca il pulsante per continuare...`,
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(
										`predictions-${matches[0]!.day}-${part! + 1}-${timestamp}`,
									)
									.setEmoji({ name: "⏩" })
									.setLabel("Continua")
									.setStyle(ButtonStyle.Primary),
							)
							.toJSON(),
					],
					flags: MessageFlags.Ephemeral,
				},
			});
	},
	async component(interaction, { reply, env }) {
		const [, actionOrDay, partOrCategoryId, timestamp, day] =
			interaction.data.custom_id.split("-");
		const time = parseInt(timestamp!);

		if (actionOrDay === "start") {
			if (Date.now() < time) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `La giornata inizia <t:${Math.round(time / 1000)}:R>!`,
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			await startPredictions(
				this.api,
				env,
				interaction,
				parseInt(day!),
				parseInt(partOrCategoryId!),
				reply,
			);
			return;
		}
		if (actionOrDay === "update") {
			if (Date.now() < time) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: `Puoi aggiornare nuovamente i dati <t:${Math.round(
							time / 1_000,
						)}:R>`,
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const [users, matches] = await prepareMatchDayData(
				env,
				parseInt(partOrCategoryId!),
			);
			const finished = matches.data.every((match) => match.match_status === 2);
			const leaderboard = resolveLeaderboard(users, matches);

			reply({
				type: InteractionResponseType.UpdateMessage,
				data: {
					embeds: getLiveEmbed(
						users,
						matches,
						leaderboard,
						parseInt(day!),
						finished,
					),
					components: finished
						? []
						: [
								new ActionRowBuilder<ButtonBuilder>()
									.addComponents(
										new ButtonBuilder()
											.setCustomId(
												`predictions-update-${partOrCategoryId}-${
													matches.data.some((match) => match.match_status === 1)
														? Date.now() + 1_000 * 60
														: Math.max(
																new Date(
																	matches.data.find(
																		(match) => match.match_status === 0,
																	)?.date_time as number | string,
																).getTime(),
																Date.now() + 1_000 * 60,
															)
												}-${day}`,
											)
											.setEmoji({ name: "🔄" })
											.setLabel("Aggiorna")
											.setStyle(ButtonStyle.Primary),
									)
									.toJSON(),
							],
				},
			});
			if (finished)
				await closeMatchDay(this.api, env, leaderboard, parseInt(day!));
			return;
		}
		if (Date.now() >= time) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						"Puoi inviare i pronostici solo fino a 15 minuti dall'inizio del primo match della giornata!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const userId = (interaction.member ?? interaction).user!.id;
		const [{ results: matches }, { results: existingPredictions }] =
			(await env.DB.batch([
				env.DB.prepare(
					`SELECT *
FROM Matches
	JOIN MatchDays ON Matches.day = MatchDays.day
WHERE Matches.day = (
		SELECT MAX(day)
		FROM MatchDays
	)
ORDER BY matchDate`,
				),
				env.DB.prepare(
					`SELECT Predictions.*
				FROM Predictions
				JOIN Users ON Predictions.userId = Users.id
				WHERE Users.id = ?`,
				).bind(userId),
			])) as [D1Result<Match & MatchDay>, D1Result<Prediction>];

		if (!matches.length) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Non c'è alcun pronostico da inviare al momento!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (parseInt(actionOrDay!) !== matches[0]!.day) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questi pronostici sono scaduti!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		reply({
			type: InteractionResponseType.Modal,
			data: buildModal(
				matches,
				parseInt(partOrCategoryId!),
				existingPredictions,
			).toJSON(),
		});
	},
});
