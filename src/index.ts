/* eslint-disable no-sparse-arrays */
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIPingInteraction,
	ButtonStyle,
	InteractionResponseType,
	RESTPostAPICurrentUserCreateDMChannelJSONBody,
	RESTPostAPICurrentUserCreateDMChannelResult,
	Routes,
	type RESTPatchAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import * as commandsObject from "./commands";
import type {
	CommandOptions,
	Env,
	Handler,
	MatchDayResponse,
	User,
} from "./util";
import {
	closeMatchDay,
	executeInteraction,
	getLiveEmbed,
	getPredictionsData,
	JsonResponse,
	loadMatches,
	MatchStatus,
	resolveLeaderboard,
	rest,
	startPredictions,
	verifyDiscordRequest,
} from "./util";

const commands: Record<string, CommandOptions<any>> = commandsObject;
const applicationCommands = Object.fromEntries(
	Object.values(commands).flatMap((cmd) => cmd.data.map((d) => [d.name, cmd])),
);
const handlers: [
	undefined,
	Handler<APIPingInteraction>,
	Handler<APIApplicationCommandInteraction>,
	Handler<APIMessageComponentInteraction>,
	Handler<APIApplicationCommandAutocompleteInteraction>,
	Handler<APIModalSubmitInteraction>,
] = [
	,
	() => ({
		type: InteractionResponseType.Pong,
	}),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"run",
			applicationCommands[interaction.data.name],
		),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"component",
			commands[interaction.data.custom_id.split("-")[0]!],
		),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"autocomplete",
			commands[interaction.data.name],
		),
	({ interaction, env, context }) =>
		executeInteraction(
			interaction,
			env,
			context,
			"modalSubmit",
			commands[interaction.data.custom_id.split("-")[0]!],
		),
];

const server: ExportedHandler<Env> = {
	fetch: async (request, env, context) => {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			if (request.method === "POST") {
				rest.setToken(env.DISCORD_TOKEN);
				const interaction = await verifyDiscordRequest(request, env);

				if (interaction instanceof Response) return interaction;
				const result = await handlers[interaction.type]({
					interaction: interaction as never,
					context,
					env,
				});

				return result
					? new JsonResponse(result)
					: new JsonResponse(
							{ error: "Internal Server Error" },
							{ status: 500 },
						);
			}
			if (request.method === "GET") return new Response("Ready!");
			return new JsonResponse({ error: "Method Not Allowed" }, { status: 405 });
		}
		return new JsonResponse({ error: "Not Found" }, { status: 404 });
	},
	scheduled: async ({}, env, ctx) => {
		const [matchDays, liveMatchDays] = await Promise.all([
			fetch(
				`https://legaseriea.it/api/season/${env.SEASON_ID}/championship/A/matchday`,
			).then((res) => res.json()) as Promise<MatchDayResponse>,
			env.KV.get("liveMatchDays"),
		]);
		const resolvedLive = liveMatchDays?.split(",").map((day) => {
			const [categoryId, messageId, nextUpdate] = day.split(":");

			return { categoryId, messageId, nextUpdate };
		});

		if (!matchDays.success)
			throw new Error(`Couldn't load season data: ${matchDays.message}`, {
				cause: matchDays.errors,
			});
		let changed = false;

		rest.setToken(env.DISCORD_TOKEN);
		ctx.waitUntil(
			Promise.all(
				matchDays.data
					.filter((d) => d.category_status === "LIVE")
					.map(async (matchDay) => {
						const found = resolvedLive?.find(
							(day) => day.categoryId === matchDay.id_category.toString(),
						);

						if (found) {
							if (Date.now() <= Number(found.nextUpdate)) {
								console.log(`Skipping match day`, found);
								return undefined;
							}
							console.log(`Updating match day`, found);
							const [users, matches] = await getPredictionsData(
								env,
								parseInt(found.categoryId!),
							);
							const finished = matches.every(
								(match) => match.match_status === MatchStatus.Finished,
							);
							const match = matches.find(
								(m) =>
									m.match_status === MatchStatus.Live ||
									m.match_status === MatchStatus.ToBePlayed,
							);
							const leaderboard = resolveLeaderboard(users, matches);

							if (match?.match_status === MatchStatus.ToBePlayed) {
								const newNextUpdate = Date.parse(match.date_time).toString();

								if (newNextUpdate !== found.nextUpdate) {
									found.nextUpdate = newNextUpdate;
									changed ||= true;
								}
							}
							await rest.patch(
								Routes.channelMessage(
									env.PREDICTIONS_CHANNEL,
									found.messageId!,
								),
								{
									body: {
										embeds: getLiveEmbed(
											users,
											matches,
											leaderboard,
											parseInt(matches[0]!.match_day_order),
											finished,
										),
									} satisfies RESTPatchAPIChannelMessageJSONBody,
								},
							);
							if (finished) {
								console.log(`Closing match day`, found);
								await closeMatchDay(
									env,
									leaderboard,
									matches,
									parseInt(matches[0]!.match_day_order),
									liveMatchDays,
								);
							}
							return undefined;
						}
						console.log(`Starting match day`, matchDay);
						return startPredictions(
							env,
							parseInt(matchDay.description),
							matchDay.id_category,
							liveMatchDays,
						);
					}),
			).then<any>(
				() =>
					changed &&
					env.KV.put(
						"liveMatchDays",
						resolvedLive!
							.map((l) => [l.categoryId, l.messageId, l.nextUpdate].join(":"))
							.join(","),
					),
			),
		);
		const matchDayData = matchDays.data.find(
			(d) => d.category_status === "TO BE PLAYED",
		);

		if (!matchDayData) return;
		const [match] = await loadMatches(matchDayData.id_category, 1).catch(
			(err) => {
				console.error(err);
				return [];
			},
		);

		if (!match) return;
		const startTime = Date.parse(match.date_time) - 900000;
		const minutes = (startTime - Date.now()) / 60_000;

		if (minutes <= 0) return;
		const { results } = await env.DB.prepare(
			`SELECT u.id
			FROM Users u
			WHERE u.reminded = 0
			AND u.remindMinutes >= ?1`,
		)
			.bind(Math.floor(minutes))
			.all<Pick<User, "id">>();

		if (!results.length) return;
		await Promise.all([
			...results.map(async ({ id: recipient_id }) => {
				const { id } = (await rest.post(Routes.userChannels(), {
					body: {
						recipient_id,
					} satisfies RESTPostAPICurrentUserCreateDMChannelJSONBody,
				})) as RESTPostAPICurrentUserCreateDMChannelResult;

				await rest.post(Routes.channelMessages(id), {
					body: {
						content:
							"⚽ È l'ora di inviare i pronostici per la prossima giornata!",
						components: [
							new ActionRowBuilder<ButtonBuilder>()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(
											`predictions-${Number(matchDayData.description)}-1-${startTime}`,
										)
										.setEmoji({ name: "⚽" })
										.setLabel("Invia pronostici")
										.setStyle(ButtonStyle.Primary),
								)
								.toJSON(),
						],
					},
				});
			}),
			env.DB.prepare(
				`UPDATE Users SET reminded = 1 WHERE id IN (${Array(results.length).fill("?").join(", ")})`,
			)
				.bind(...results.map(({ id }) => id))
				.run(),
		]);
	},
};

export default server;
