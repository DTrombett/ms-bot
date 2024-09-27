import { Env, Leaderboard, type Match } from ".";

export const closeMatchDay = async (
	env: Env,
	leaderboard: Leaderboard,
	matches: Match[],
	day: number,
	oldLiveMatchDays: string | null,
) => {
	const query = env.DB.prepare(`UPDATE Users
SET dayPoints = COALESCE(dayPoints, 0) + ?1,
	matchPointsHistory = COALESCE(matchPointsHistory, "${",".repeat(
		day - 2,
	)}") || ?2,
	reminded = 0
WHERE id = ?3`);

	return Promise.all([
		env.DB.batch([
			...leaderboard.map(([user, matchPoints, dayPoints]) =>
				query.bind(dayPoints, `,${matchPoints}`, user.id),
			),
			env.DB.prepare(
				`DELETE FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
			).bind(...matches.map((m) => m.match_id)),
		]),
		env.KV.put(
			"liveMatchDays",
			oldLiveMatchDays
				?.split(",")
				.filter((v) => v.startsWith(`${matches[0]?.match_day_id_category}:`))
				.join(",") ?? "",
		),
	]);
};
