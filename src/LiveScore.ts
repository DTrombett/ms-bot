import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import {
	Routes,
	type RESTPatchAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { io } from "socket.io-client";
import {
	getLiveEmbed,
	loadMatches,
	MatchStatus,
	resolveLeaderboard,
	rest,
	type Leaderboard,
	type Match,
	type Prediction,
	type ResolvedUser,
	type User,
} from "./util/index.ts";

export type Params = {
	matchDay: { day: number; id: number };
	messageId: string;
};

export class LiveScore extends WorkflowEntrypoint<Env, Params> {
	override async run(
		event: Readonly<WorkflowEvent<Params>>,
		step: WorkflowStep,
	) {
		let time: number | void = event.timestamp.getTime();

		do {
			await step.sleepUntil(
				`sleep until ${time}`,
				Math.max(time, Date.now() + 1_000),
			);
			time = await step.do(
				`run live scores ${time}`,
				{
					retries: { limit: Infinity, backoff: "constant", delay: "1 hour" },
					timeout: "3 hours",
				},
				async () => {
					const socket = io("wss://www.legaseriea.it", {
						tryAllTransports: true,
					});

					socket.on("connect", () => {
						console.log("Live scores connected!");
					});
					const matches = await loadMatches(event.payload.matchDay.id);
					let status = this.isFinished(matches);
					const users = await this.loadPredictions(matches);
					const promise = new Promise<number | void>((resolve, reject) => {
						if (!socket.active) {
							reject(new Error("Socket connection failed"));
							return;
						}
						socket.on("callApi", (data: string) => {
							const updates: {
								ora: string;
								match_id: number;
								away_goal: number;
								home_goal: number;
								match_day_id: number;
								match_status: MatchStatus;
							}[] = JSON.parse(data);
							let changed = false;

							for (const update of updates) {
								const found = matches.find(
									(m) => m.match_id === update.match_id,
								);

								if (found) {
									Object.assign(found, update);
									changed = true;
								}
							}
							if (!changed) return;
							this.updateMatchDayMessage(
								users,
								matches,
								event.payload.matchDay.day,
								(status = this.isFinished(matches)) === true,
								event.payload.messageId,
							)
								.catch(console.error)
								.finally(
									status === true
										? resolve
										: status === undefined
											? reject.bind(
													null,
													new Error("Some matches were postponed"),
												)
											: status
												? resolve.bind(null, status)
												: undefined,
								);
						});
						socket.on("connect_error", (error) => {
							console.error(error);
							if (!socket.active) resolve(Date.now() + 1000 * 20);
						});
						socket.on("disconnect", (error, description) => {
							console.error(new Error(error), description);
							if (!socket.active) resolve(Date.now() + 1000 * 20);
						});
					});

					await this.updateMatchDayMessage(
						users,
						matches,
						event.payload.matchDay.day,
						status === true,
						event.payload.messageId,
					);
					if (status === true) return undefined;
					if (status === undefined)
						throw new Error("Some matches were postponed");
					if (status && status > Date.now()) return status;
					return promise;
				},
			);
		} while (time);
		const matches = await step.do(
			"Get matches",
			loadMatches.bind(null, event.payload.matchDay.id),
		);
		const users = await step.do(
			"Load users",
			this.loadPredictions.bind(this, matches),
		);
		const leaderboard = resolveLeaderboard(users, matches);
		const newUsers = await step.do(
			"Close match day",
			this.closeMatchDay.bind(
				this,
				event.payload.matchDay.day,
				leaderboard,
				matches,
			),
		);
		await step.do<void>(
			"Update statistics",
			this.updateMatchDayMessage.bind(
				this,
				newUsers,
				matches,
				event.payload.matchDay.day,
				true,
				event.payload.messageId,
				leaderboard,
			),
		);
		await step.do<void>(
			"Unpin message",
			this.unpinMessage.bind(this, event.payload.messageId),
		);
	}

	private isFinished(matches: Match[]) {
		if (matches.every((m) => m.match_status === MatchStatus.Finished))
			return true;
		if (matches.some((m) => m.match_status === MatchStatus.Live)) return false;
		const nextMatch = matches.find(
			(m) => m.match_status === MatchStatus.ToBePlayed,
		);

		if (nextMatch) return Date.parse(nextMatch.date_time);
		return undefined;
	}

	private async loadPredictions(
		matches: Pick<Match, "match_id">[],
	): Promise<ResolvedUser[]> {
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

	private async updateMatchDayMessage(
		users: ResolvedUser[],
		matches: Match[],
		day: number,
		finished: boolean,
		messageId: string,
		leaderboard = resolveLeaderboard(users, matches),
	) {
		await rest.patch(
			Routes.channelMessage(this.env.PREDICTIONS_CHANNEL, messageId),
			{
				body: {
					embeds: getLiveEmbed(users, matches, leaderboard, day, finished),
				} satisfies RESTPatchAPIChannelMessageJSONBody,
			},
		);
	}

	private async unpinMessage(messageId: string) {
		await rest.delete(
			Routes.channelMessagesPin(this.env.PREDICTIONS_CHANNEL, messageId),
		);
	}

	private async closeMatchDay(
		day: number,
		leaderboard: Leaderboard,
		matches: Match[],
	) {
		const query = this.env.DB.prepare(`UPDATE Users
			SET dayPoints = COALESCE(dayPoints, 0) + ?1,
				matchPointsHistory = COALESCE(matchPointsHistory, "${",".repeat(
					Math.max(day - 2, 0),
				)}") || ?2,
				reminded = 0,
				match = NULL
			WHERE id = ?3`);
		const newUsers: ResolvedUser[] = [];

		await this.env.DB.batch([
			...leaderboard.map(([user, matchPoints, dayPoints]) => {
				newUsers.push({
					...user,
					dayPoints: (user.dayPoints ?? 0) + dayPoints,
					matchPointsHistory: `${
						user.matchPointsHistory ?? ",".repeat(Math.max(day - 2, 0))
					},${matchPoints}`,
					match: null,
				});
				return query.bind(dayPoints, `,${matchPoints}`, user.id);
			}),
			this.env.DB.prepare(
				`DELETE FROM Predictions
				WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
			).bind(...matches.map((m) => m.match_id)),
		]);
		return newUsers;
	}
}
