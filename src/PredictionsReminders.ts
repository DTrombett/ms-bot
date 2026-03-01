import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	ButtonStyle,
	ComponentType,
	Routes,
	type APIUser,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult,
} from "discord-api-types/v10";
import {
	createLiveComponents,
	getNextMatch,
} from "./util/createLiveComponents.ts";
import { getLiveEmbed } from "./util/getLiveEmbed.ts";
import { getMatchDayNumber } from "./util/getMatchDayNumber.ts";
import { fetchMatchDays } from "./util/getSeasonData.ts";
import { rest } from "./util/globals.ts";
import { hashMatches } from "./util/hashMatches.ts";
import { loadMatches } from "./util/loadMatches.ts";
import { createMatchName } from "./util/normalizeTeamName.ts";
import { resolveLeaderboard } from "./util/resolveLeaderboard.ts";
import { formatLongTime, TimeUnit } from "./util/time.ts";

const KV_KEY = "started-matchdays";
const timeout = 20 * TimeUnit.Second;

export type Params = { matchDay?: { day: number; id: string } };

export class PredictionsReminders extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		const started = await step.do(
			"load started matchdays",
			{ timeout },
			this.loadStartedMatchdays.bind(this),
		);
		const matchDay =
			event.payload.matchDay ??
			(await step.do(
				"get match day",
				{ timeout },
				this.getMatchDay.bind(this, started),
			));
		if (!matchDay) {
			console.log("No match day available");
			return;
		}
		const startTime = await step.do(
			"get start time",
			{ timeout },
			this.getStartTime.bind(this, matchDay),
		);
		const diff = startTime - event.timestamp.getTime();

		if (diff > TimeUnit.Day) {
			console.log(`Next match day is in ${formatLongTime(diff)}`);
			return;
		}
		if (diff > TimeUnit.Second) {
			const reminders = await step.do(
				"get prediction reminders",
				{ timeout },
				this.getReminders.bind(this, startTime),
			);

			await Promise.all(
				reminders.map(async ([userId, date]) => {
					if (
						await step.do(
							`check if ${userId} remind already set`,
							{ timeout },
							this.notExists.bind(this, userId, matchDay.id),
						)
					)
						await step.do<void>(
							`create ${userId} reminder`,
							{ timeout },
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
			{ timeout },
			loadMatches.bind(null, matchDay.id),
		);
		const users = await step.do(
			"load predictions",
			{ timeout },
			this.loadPredictions.bind(this, matches),
		);
		const promises: Promise<void>[] = [];
		for (let i = 0; i < users.length; )
			promises.push(
				step.do<void>(
					`send chunk ${i / 5}`,
					{ timeout },
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
			{ timeout },
			this.sendMatchDayMessage.bind(this, users, matches, matchDay),
		);
		started.push(matchDay.id);
		await Promise.all([
			step.do<void>(
				"pin message",
				{ timeout },
				this.pinMessage.bind(this, messageId),
			),
			step.do<void>(
				"update started matchday",
				{ timeout },
				this.updateStartedMatchday.bind(this, started),
			),
		]);
		const newMatchDay = await step.do(
			"Load new match day",
			{ timeout },
			this.getMatchDay.bind(this, started),
		);
		if (!newMatchDay) {
			console.log("No match to be played!");
			return;
		}
		const newStartTime = await step.do(
			"Get new start time",
			{ timeout },
			this.getStartTime.bind(this, newMatchDay),
		);
		const date = Math.round(newStartTime / 1_000);
		if (date - Date.now() / 1_000 > 1)
			await step.do(
				"Send new match day message",
				{ timeout },
				this.sendNewMatchDayMessage.bind(this, date, newStartTime, newMatchDay),
			);
	}

	private async getMatchDay(started: string[] = []) {
		const matchDays = await fetchMatchDays();
		const md = matchDays.find((d) => !started.includes(d.matchSetId));

		return md && { day: getMatchDayNumber(md), id: md.matchSetId };
	}

	private async getStartTime(day: { day: number; id: string }) {
		const matches = await loadMatches(day.id);

		return Date.parse(matches[0]!.matchDateUtc) - 5 * TimeUnit.Minute;
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

	private async notExists(userId: string, matchId: string) {
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
		matchDay: { day: number; id: string },
	) {
		await this.env.REMINDER.create({
			id: `${userId}-predictions-${matchDay.day}`,
			params: {
				duration: Math.max(date - Date.now(), 0),
				message: {
					content:
						"⚽ È l'ora di inviare i pronostici per la prossima giornata!",
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									custom_id: `predictions-${Number(
										matchDay.day,
									)}-1-${startTime}-${userId}`,
									emoji: { name: "⚽" },
									label: "Invia pronostici",
									style: ButtonStyle.Primary,
									type: ComponentType.Button,
								},
								{
									emoji: { name: "🌐" },
									label: "Utilizza la dashboard",
									style: ButtonStyle.Link,
									type: ComponentType.Button,
									url: "https://ms-bot.trombett.org/predictions",
								},
							],
						},
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
				).bind(...matches.map((m) => m.matchId)),
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
					.map((p) => ({ matchId: p.matchId, prediction: p.prediction })),
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
									(user.avatar == null ?
										rest.cdn.defaultAvatar(
											user.discriminator === "0" ?
												Number(BigInt(user.id) >> 22n) % 6
											:	Number(user.discriminator) % 5,
										)
									:	rest.cdn.avatar(user.id, user.avatar, {
											size: 4096,
											extension: "png",
										})),
							},
							color: user?.accent_color ?? 0x3498db,
							fields: matches.map((match) => ({
								name: createMatchName(match),
								value:
									(data.match === match.matchId ? "⭐ " : "") +
									(data.predictions.find(
										(predict) => predict.matchId === match.matchId,
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
		matchDay: { day: number; id: string },
	) {
		const { id } = (await rest.post(
			Routes.channelMessages(this.env.PREDICTIONS_CHANNEL),
			{
				body: {
					embeds: getLiveEmbed(
						users,
						matches,
						resolveLeaderboard(users, matches),
						matchDay.day,
					),
					components: createLiveComponents(
						matchDay.id,
						hashMatches(matches),
						getNextMatch(matches) || Date.now(),
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

	private async updateStartedMatchday(started: string[]) {
		await this.env.KV.put(KV_KEY, started.join(","));
	}

	private async loadStartedMatchdays() {
		return (
			(await this.env.KV.get(KV_KEY).catch(() => undefined))
				?.split(",")
				.filter(Boolean) ?? []
		);
	}

	private async sendNewMatchDayMessage(
		date: number,
		startTime: number,
		day: { day: number; id: string },
	) {
		await rest.post(Routes.channelMessages(this.env.PREDICTIONS_CHANNEL), {
			body: {
				content: `<@&${this.env.PREDICTIONS_ROLE}>, potete inviare da ora i pronostici per la prossima giornata!\nPer farlo inviate il comando \`/predictions send\` e seguire le istruzioni o premete il pulsante qui in basso. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)!`,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								custom_id: `predictions-${day.day}-1-${startTime}`,
								emoji: { name: "⚽" },
								label: "Invia pronostici",
								style: ButtonStyle.Primary,
								type: ComponentType.Button,
							},
							{
								emoji: { name: "🌐" },
								label: "Utilizza la dashboard",
								style: ButtonStyle.Link,
								type: ComponentType.Button,
								url: "https://ms-bot.trombett.org/predictions",
							},
						],
					},
				],
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	}
}
