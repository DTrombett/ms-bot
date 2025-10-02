import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	Routes,
	type APIUser,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import {
	formatLongTime,
	getLiveEmbed,
	getMatchDayNumber,
	loadMatches,
	normalizeTeamName,
	resolveLeaderboard,
	rest,
	type Env,
	type Match,
	type MatchDayResponse,
	type Prediction,
	type ResolvedUser,
	type User,
} from "./util";

const KV_KEY = "started-matchdays";

export type Params = {
	matchDay?: { day: number; id: number };
};

export class PredictionsReminders extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const started = await step.do(
			"load started matchdays",
			{ timeout: 10_000 },
			this.loadStartedMatchdays.bind(this),
		);
		const matchDay =
			event.payload.matchDay ??
			(await step.do(
				"get match day",
				{ timeout: 10_000 },
				this.getMatchDay.bind(this, started),
			));

		if (!matchDay) {
			console.log("No match day available");
			return;
		}
		const startTime = await step.do(
			"get start time",
			{ timeout: 20_000 },
			this.getStartTime.bind(this, matchDay),
		);
		const diff = startTime - event.timestamp.getTime();

		if (diff > 24 * 60 * 60 * 1_000) {
			console.log(`Next match day is in ${formatLongTime(diff)}`);
			return;
		}
		rest.setToken(this.env.DISCORD_TOKEN);
		if (diff > 1_000) {
			const reminders = await step.do(
				"get prediction reminders",
				{ timeout: 10_000 },
				this.getReminders.bind(this, startTime),
			);

			await Promise.all(
				reminders.map(async ([userId, date]) => {
					if (
						await step.do(
							`check if ${userId} remind already set`,
							{ timeout: 10_000 },
							this.notExists.bind(this, userId, matchDay.id),
						)
					)
						await step.do<void>(
							`create ${userId} reminder`,
							{ timeout: 10_000 },
							this.createReminder.bind(this, userId, date, startTime, matchDay),
						);
				}),
			);
		}
		await step.sleepUntil(
			"match day start",
			Math.max(startTime, Date.now() + 1_000),
		);
		const matches = await step.do(
			"load matches",
			{ timeout: 10_000 },
			loadMatches.bind(null, matchDay.id),
		);
		const users = await step.do(
			"load predictions",
			{ timeout: 10_000 },
			this.loadPredictions.bind(this, matches),
		);
		const promises: Promise<void>[] = [];

		for (let i = 0; i < users.length; )
			promises.push(
				step.do<void>(
					`send chunk ${i / 5}`,
					{ timeout: 40_000 },
					this.sendEmbeds.bind(
						this,
						matchDay.day,
						matches,
						users.slice(i, (i += 5)),
					),
				),
			);
		await Promise.all(promises);
		const messageId = await step.do(
			"send message",
			{ timeout: 20_000 },
			this.sendMatchDayMessage.bind(this, users, matches, matchDay.day),
		);
		started.push(matchDay.id);
		await Promise.all([
			step.do<void>(
				"pin message",
				{ timeout: 20_000 },
				this.pinMessage.bind(this, messageId),
			),
			step.do<void>(
				"start live score",
				{ timeout: 10_000 },
				this.startLiveScore.bind(this, matchDay, messageId),
			),
			step.do<void>(
				"update started matchday",
				{ timeout: 10_000 },
				this.updateStartedMatchday.bind(this, started),
			),
		]);
		const newMatchDay = await step.do(
			"Load new match day",
			this.loadNewMatchDay.bind(this, matchDay.id, started),
		);

		if (!newMatchDay) {
			console.error("No match to be played!");
			return;
		}
		const newStartTime = await step.do(
			"Get new start time",
			{ timeout: 10_000 },
			this.getStartTime.bind(this, newMatchDay),
		);
		const date = Math.round(newStartTime / 1_000);

		if (date - Date.now() / 1_000 > 1)
			await step.do(
				"Send new match day message",
				{ timeout: 20_000 },
				this.sendNewMatchDayMessage.bind(this, date, newStartTime, newMatchDay),
			);
	}

	private async getMatchDay(started: number[] = []) {
		const matchDays = await fetch(
			`https://legaseriea.it/api/season/${this.env.SEASON_ID}/championship/A/matchday`,
		).then<MatchDayResponse>((res) => res.json());

		if (!matchDays.success) throw new Error(matchDays.message);
		const md = matchDays.data.find(
			(d) =>
				d.category_status === "TO BE PLAYED" &&
				!started.includes(d.id_category),
		);
		return md && { day: getMatchDayNumber(md), id: md.id_category };
	}

	private async getStartTime(day: { day: number; id: number }) {
		const matches = await loadMatches(day.id, 1);

		return Date.parse(matches[0]!.date_time) - 5 * 60 * 1000;
	}

	private async getReminders(startTime: number) {
		const { results } = await this.env.DB.prepare(
			`SELECT u.id, u.remindMinutes
				FROM Users u
				WHERE u.reminded = 0
				AND u.remindMinutes IS NOT NULL`,
		).all<Pick<User, "id" | "remindMinutes">>();

		return results
			.sort((a, b) => b.remindMinutes! - a.remindMinutes!)
			.map<
				[recipient_id: string, date: number]
			>((u) => [u.id, startTime - u.remindMinutes! * 60 * 1000]);
	}

	private async notExists(userId: string, matchId: number) {
		return (
			(await this.env.REMINDER.get(`${userId}-predictions-${matchId}`).catch(
				() => {},
			)) === undefined
		);
	}

	private async createReminder(
		userId: string,
		date: number,
		startTime: number,
		matchDay: {
			day: number;
			id: number;
		},
	) {
		await this.env.REMINDER.create({
			id: `${userId}-predictions-${matchDay.id}`,
			params: {
				duration: Math.max(date - Date.now(), 0),
				message: {
					content:
						"⚽ È l'ora di inviare i pronostici per la prossima giornata!",
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(
										`predictions-${Number(matchDay.day)}-1-${startTime}-${userId}`,
									)
									.setEmoji({ name: "⚽" })
									.setLabel("Invia pronostici")
									.setStyle(ButtonStyle.Primary),
								new ButtonBuilder()
									.setURL("https://ms-bot.trombett.org/predictions")
									.setEmoji({ name: "🌐" })
									.setLabel("Utilizza la dashboard")
									.setStyle(ButtonStyle.Link),
							)
							.toJSON(),
					],
				},
				remind: "*Pronostici*",
				userId,
			},
		});
	}

	private async loadPredictions(matches: Match[]) {
		const [{ results: predictions }, { results: rawUsers }] =
			(await this.env.DB.batch([
				this.env.DB.prepare(
					`SELECT *
					FROM Predictions
					WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
				).bind(...matches.map((m) => m.match_id)),
				this.env.DB.prepare(`SELECT id, dayPoints, matchPointsHistory, match
					FROM Users`),
			])) as [
				D1Result<Prediction>,
				D1Result<
					Pick<User, "dayPoints" | "id" | "match" | "matchPointsHistory">
				>,
			];

		return rawUsers
			.map((user) => ({
				...user,
				predictions: predictions
					.filter((p) => p.userId === user.id)
					.map((p) => ({
						matchId: p.matchId,
						prediction: p.prediction,
					})),
			}))
			.filter((u) => u.predictions.length || u.dayPoints != null);
	}

	private async sendEmbeds(
		day: number,
		matches: Match[],
		users: ResolvedUser[],
	) {
		await rest.post(Routes.channelMessages(this.env.PREDICTIONS_CHANNEL), {
			body: {
				embeds: await Promise.all(
					users.map(async (data) => {
						const user = (await rest
							.get(Routes.user(data.id))
							.catch(() => {})) as APIUser | undefined;

						return {
							author: {
								name: user?.global_name ?? user?.username ?? data.id,
								icon_url:
									user &&
									(user.avatar == null
										? rest.cdn.defaultAvatar(
												user.discriminator === "0"
													? Number(BigInt(user.id) >> 22n) % 6
													: Number(user.discriminator) % 5,
											)
										: rest.cdn.avatar(user.id, user.avatar, {
												size: 4096,
												extension: "png",
											})),
							},
							color: user?.accent_color ?? 0x3498db,
							fields: matches.map((match) => ({
								name: [match.home_team_name, match.away_team_name]
									.map(normalizeTeamName)
									.join(" - "),
								value:
									(data.match === match.match_id ? "⭐ " : "") +
									(data.predictions.find(
										(predict) => predict.matchId === match.match_id,
									)?.prediction ?? "*Non presente*"),
							})),
							thumbnail: {
								url: "https://img.legaseriea.it/vimages/6685b340/SerieA_ENILIVE_RGB.jpg",
							},
							title: `${day}ª Giornata Serie A Enilive`,
						};
					}),
				),
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}

	private async sendMatchDayMessage(
		users: ResolvedUser[],
		matches: Match[],
		day: number,
	) {
		const { id } = (await rest.post(
			Routes.channelMessages(this.env.PREDICTIONS_CHANNEL),
			{
				body: {
					embeds: getLiveEmbed(
						users,
						matches,
						resolveLeaderboard(users, matches),
						day,
					),
				} satisfies RESTPostAPIChannelMessageJSONBody,
			},
		)) as RESTPostAPIChannelMessageResult;

		return id;
	}

	private async pinMessage(messageId: string) {
		await rest.put(
			Routes.channelMessagesPin(this.env.PREDICTIONS_CHANNEL, messageId),
		);
	}

	private async startLiveScore(
		matchDay: { day: number; id: number },
		messageId: string,
	) {
		await this.env.LIVE_SCORE.create({ params: { matchDay, messageId } });
	}

	private async updateStartedMatchday(started: number[]) {
		await this.env.KV.put(KV_KEY, started.join(","));
	}

	private async loadNewMatchDay(lastId: number, started: number[] = []) {
		const matchDays = (await fetch(
			`https://legaseriea.it/api/season/${this.env.SEASON_ID}/championship/A/matchday`,
		).then((res) => res.json())) as MatchDayResponse;

		if (!matchDays.success)
			throw new Error(matchDays.message, {
				cause: matchDays.errors,
			});
		const md = matchDays.data.find(
			(d) =>
				d.id_category !== lastId &&
				d.category_status === "TO BE PLAYED" &&
				!started.includes(d.id_category),
		);
		return md && { day: getMatchDayNumber(md), id: md.id_category };
	}

	private async loadStartedMatchdays() {
		return ((await this.env.KV.get(KV_KEY).catch(() => undefined)) ?? "")
			.split(",")
			.filter(Boolean)
			.map(Number);
	}

	private async sendNewMatchDayMessage(
		date: number,
		startTime: number,
		day: { day: number; id: number },
	) {
		await rest.post(Routes.channelMessages(this.env.PREDICTIONS_CHANNEL), {
			body: {
				content: `<@&${this.env.PREDICTIONS_ROLE}>, potete inviare da ora i pronostici per la prossima giornata!\nPer farlo inviate il comando \`/predictions send\` e seguire le istruzioni o premete il pulsante qui in basso. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)!`,
				components: [
					new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setCustomId(`predictions-${day.day}-1-${startTime}`)
								.setEmoji({ name: "⚽" })
								.setLabel("Invia pronostici")
								.setStyle(ButtonStyle.Primary),
							new ButtonBuilder()
								.setURL("https://ms-bot.trombett.org/predictions")
								.setEmoji({ name: "🌐" })
								.setLabel("Utilizza la dashboard")
								.setStyle(ButtonStyle.Link),
						)
						.toJSON(),
				],
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}
}
