import {
	ActionRowBuilder,
	ButtonBuilder,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
} from "@discordjs/builders";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	InteractionResponseType,
	MessageFlags,
	Routes,
	TextInputStyle,
	type APIApplicationCommandInteractionDataSubcommandOption,
	type APIUser,
} from "discord-api-types/v10";
import {
	Command,
	Prediction,
	createMatchDayComponents,
	getUserPredictions,
	loadMatches,
	rest,
	startPredictions,
	type MatchData,
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
	matches: MatchData[],
	{
		part = 0,
		predictions,
		locale = "",
	}: Partial<{
		part: number;
		predictions: Pick<Prediction, "matchId" | "prediction">[];
		locale: string;
	}> = {},
) => {
	const { matchday, round } = matches[0]!;
	const firstRound = round.metaData.type === "GROUP_STANDINGS";

	return new ModalBuilder()
		.setCustomId(`predictions-${matchday.id}-${part}`)
		.setTitle(
			`Pronostici ${firstRound ? matchday.translations?.longName?.[locale] ?? matchday.longName : round.translations?.name?.[locale] ?? round.metaData.name} (${part + 1}/${Math.ceil(matches.length / 5)})`,
		)
		.addComponents(
			matches.slice(part * 5, (part + 1) * 5).map((match) => {
				const textInput = new TextInputBuilder()
					.setCustomId(match.id)
					.setLabel(
						`${
							match.homeTeam.translations?.displayName?.[locale] ??
							match.homeTeam.internationalName
						} - ${
							match.awayTeam.translations?.displayName?.[locale] ??
							match.awayTeam.internationalName
						}`,
					)
					.setStyle(TextInputStyle.Short)
					.setRequired(true)
					.setPlaceholder(
						`es. ${predictionExamples[Math.floor(Math.random() * predictionExamples.length)]}`,
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
};

export const predictions = new Command({
	data: [
		{
			name: "predictions",
			description:
				"Invia e modifica i tuoi pronostici calcistici per divertirti con i risultati sportivi",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: "send",
					description: "Invia i tuoi pronostici per la competizione in corso",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "view",
					description:
						"Visualizza i tuoi pronostici o quelli di un altro utente",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							description: "L'utente di cui vedere i pronostici (default: Tu)",
							type: ApplicationCommandOptionType.User,
						},
					],
				},
				{
					name: "start",
					description: "Inizia la giornata",
					type: ApplicationCommandOptionType.Subcommand,
				},
				{
					name: "set-favorite",
					description: "Imposta il tuo team preferito",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "team",
							description: "Il team che vincerà il torneo",
							type: ApplicationCommandOptionType.String,
							required: true,
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

		if (subCommand.name === "reminder") {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: { content: "Questo comando non è ancora disponibile :(" },
			});
			return;
		}
		const userId = (interaction.member ?? interaction).user!.id;
		const options: Record<string, boolean | number | string> = {};

		if (subCommand.options)
			for (const option of subCommand.options)
				options[option.name] = option.value;
		const matches = await loadMatches();
		const now = Date.now();

		if (subCommand.name === "set-favorite") {
			if (
				now >=
				Date.parse(matches[0]!.kickOffTime.dateTime) - 15 * 60 * 1000
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Puoi impostare la squadra favorita solo prima dell'inizio della prima giornata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const teams = matches
				.filter((m) => m.matchday.id === matches[0]!.matchday.id)
				.flatMap((m) => [m.awayTeam, m.homeTeam]);
			const locale = interaction.locale.split("-")[0]!.toUpperCase();
			const selected = (options.team as string).toLowerCase();
			const team = teams.find(
				(t) =>
					t.internationalName.toLowerCase() === selected ||
					t.translations?.displayName?.[locale]?.toLowerCase() === selected ||
					t.translations?.displayName?.IT?.toLowerCase() === selected,
			);

			if (!team) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Squadra non trovata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			await env.DB.batch([
				env.DB.prepare(
					`INSERT
	OR IGNORE INTO Users(id)
VALUES (?)`,
				).bind(userId),
				env.DB.prepare(
					`UPDATE Users
SET team = ?1
WHERE id = ?2`,
				).bind(team.id, userId),
			]);
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: `La tua squadra preferita è ora **${team.translations?.displayName?.[locale] ?? team.internationalName}**!`,
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (subCommand.name === "start") {
			const current = await env.KV.get("currentMatchDay");

			if (current) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Una giornata è già in corso!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
		}
		const isDifferentUser = options.user && options.user !== userId;

		reply({
			type: InteractionResponseType.ChannelMessageWithSource,
			data: {
				content: "Scegli la giornata cliccando il pulsante corrispondente.",
				components: createMatchDayComponents(
					matches,
					interaction.locale.split("-")[0]!.toUpperCase(),
					subCommand.name === "send"
						? "e"
						: subCommand.name === "start"
							? "s"
							: `v${isDifferentUser ? `-${options.user}` : ""}`,
					subCommand.name === "send"
						? (startTime) => now >= startTime
						: subCommand.name === "start" || isDifferentUser
							? (startTime) => now < startTime
							: undefined,
				),
				flags: MessageFlags.Ephemeral,
			},
		});
	},
	async modalSubmit(interaction, { reply, env }) {
		const [, matchDayId, partString] = interaction.data.custom_id.split("-");
		const part = Number(partString) || 0;
		const matches = await loadMatches(matchDayId);

		if (matches.length <= part * 5) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Non è presente nessuna partita disponibile!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (
			matches.some(
				(m) =>
					m.awayTeam.teamTypeDetail === "FAKE" ||
					m.homeTeam.teamTypeDetail === "FAKE",
			)
		) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Questa giornata non è ancora disponibile!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		if (
			Date.now() >=
			Date.parse(matches[0]!.kickOffTime.dateTime) - 15 * 60 * 1000
		) {
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content:
						"Puoi inviare o modificare i pronostici solo fino a 15 minuti dall'inizio del primo match della giornata!",
					flags: MessageFlags.Ephemeral,
				},
			});
			return;
		}
		const userId = (interaction.member ?? interaction).user!.id;
		const total = Math.ceil(matches.length / 5);
		const invalid: string[] = [];
		const resolved: Record<string, string | undefined> = {};
		const newPredictions: Prediction[] = [];
		const locale = interaction.locale.split("-")[0]!.toUpperCase();
		const { results: existingPredictions } = await getUserPredictions(
			env,
			matches,
			userId,
		);

		for (const {
			components: [field],
		} of interaction.data.components) {
			const value = field!.value.trim();
			const match = value.toLowerCase().match(predictionRegex);

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
				const found = matches.find((m) => m.id === field!.custom_id)!;

				invalid.push(
					`${
						found.homeTeam.translations?.displayName?.[locale] ??
						found.homeTeam.internationalName
					} - ${
						found.awayTeam.translations?.displayName?.[locale] ??
						found.awayTeam.internationalName
					}`,
				);
			} else if (
				existingPredictions.find((p) => p.matchId === field?.custom_id)
					?.prediction !==
				(resolved[field!.value] ??= match.groups.prediction
					? `${match.groups.prediction.toUpperCase()} (${
							match.groups.first
						} - ${match.groups.second})`
					: value.toUpperCase())
			)
				newPredictions.push({
					matchId: field!.custom_id,
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
									.setCustomId(`predictions-${matchDayId}-e-${part}`)
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
		if (part + 1 === total)
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Pronostici inviati correttamente!",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`predictions-${matchDayId}-e`)
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
					content: `Parte **${part + 1} di ${total}** inviata correttamente! Clicca il pulsante per continuare...`,
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`predictions-${matchDayId}-e-${part + 1}`)
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
		const [, matchDayId, action, arg0] = interaction.data.custom_id.split("-");
		const matches = await loadMatches(matchDayId);

		if (!matchDayId) return;
		if (action === "e") {
			const part = Number(arg0) || 0;

			if (matches.length <= part * 5) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non è presente nessuna partita disponibile!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				matches.some(
					(m) =>
						m.awayTeam.teamTypeDetail === "FAKE" ||
						m.homeTeam.teamTypeDetail === "FAKE",
				)
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Questa giornata non è ancora disponibile!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				Date.now() >=
				Date.parse(matches[0]!.kickOffTime.dateTime) - 15 * 60 * 1000
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Puoi inviare o modificare i pronostici solo fino a 15 minuti dall'inizio del primo match della giornata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const { results: existingPredictions } = await getUserPredictions(
				env,
				matches,
				(interaction.member ?? interaction).user?.id,
			);

			reply({
				type: InteractionResponseType.Modal,
				data: buildModal(matches, {
					locale: interaction.locale.split("-")[0]!.toUpperCase(),
					part,
					predictions: existingPredictions,
				}).toJSON(),
			});
			return;
		}
		if (action === "v") {
			const author = (interaction.member ?? interaction).user!.id;
			const userId = arg0 ?? author;

			if (!matches.length) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Non è presente nessuna partita disponibile per questa giornata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				matches.some(
					(m) =>
						m.awayTeam.teamTypeDetail === "FAKE" ||
						m.homeTeam.teamTypeDetail === "FAKE",
				)
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Questa giornata non è ancora disponibile!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			if (
				author !== userId &&
				Date.now() <
					Date.parse(matches[0]!.kickOffTime.dateTime) - 15 * 60 * 1000
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content:
							"Puoi vedere i pronostici di altri utenti solo dopo l'inizio della giornata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const { results: existingPredictions } = await getUserPredictions(
				env,
				matches,
				userId,
			);

			if (!existingPredictions.length) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "Non è presente alcun pronostico!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			const user =
				author === userId
					? (interaction.member ?? interaction).user!
					: ((await rest.get(Routes.user(userId)).catch(() => {})) as
							| APIUser
							| undefined);
			const locale = interaction.locale.split("-")[0]!.toUpperCase();
			let { team } = existingPredictions[0]!;

			for (const { awayTeam, homeTeam } of matches)
				if (awayTeam.id === team) {
					team =
						awayTeam.translations?.displayName?.[locale] ??
						awayTeam.internationalName;
					break;
				} else if (homeTeam.id === team) {
					team =
						homeTeam.translations?.displayName?.[locale] ??
						homeTeam.internationalName;
					break;
				}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: [
						{
							author: {
								name: user?.global_name ?? user?.username ?? userId,
								icon_url:
									user?.avatar == null
										? rest.cdn.defaultAvatar(
												!user || user.discriminator === "0"
													? Number(BigInt(userId) >> 22n) % 6
													: Number(user.discriminator) % 5,
											)
										: rest.cdn.avatar(user.id, user.avatar, {
												size: 4096,
												extension: "png",
											}),
							},
							color: 0x3498db,
							description: `Squadra favorita: ${team ? `**${team}**` : "*Non presente*"}`,
							fields: matches.map((match) => ({
								name: `${
									match.homeTeam.translations?.displayName?.[locale] ??
									match.homeTeam.internationalName
								} - ${
									match.awayTeam.translations?.displayName?.[locale] ??
									match.awayTeam.internationalName
								} (<t:${Math.round(
									Date.parse(match.kickOffTime.dateTime) / 1_000,
								)}:F>)`,
								value:
									existingPredictions.find(
										(predict) => predict.matchId === match.id,
									)?.prediction ?? "*Non presente*",
							})),
							thumbnail: {
								url: "https://upload.wikimedia.org/wikipedia/it/f/f0/UEFA_Euro_2024_Logo.png",
							},
							title: `${matches[0]!.round.metaData.type === "GROUP_STANDINGS" ? `${matches[0]!.round.translations?.name?.[locale] ?? "Fase a gironi"} - ${matches[0]!.matchday.translations?.longName?.[locale] ?? matches[0]!.matchday.longName}` : matches[0]!.round.translations?.name?.[locale] ?? matches[0]!.round.metaData.name} UEFA EURO 2024`,
							url: "https://uefa.com/euro2024",
						},
					],
					flags:
						Date.now() <
						Date.parse(matches[0]!.kickOffTime.dateTime) - 15 * 60 * 1000
							? MessageFlags.Ephemeral
							: undefined,
				},
			});
			return;
		}
		if (action === "s") {
			if (
				Date.now() <
				Date.parse(matches[0]!.kickOffTime.dateTime) - 15 * 60 * 1000
			) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: { content: "La giornata non è ancora iniziata!" },
				});
				return;
			}
			const message = await env.KV.get(`matchDayMessage-${matchDayId}`);

			if (message) {
				reply({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						content: "La giornata è già stata iniziata!",
						flags: MessageFlags.Ephemeral,
					},
				});
				return;
			}
			reply({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "Giornata iniziata!",
					flags: MessageFlags.Ephemeral,
				},
			});
			await startPredictions(env, matchDayId, matches);
		}
	},
});
