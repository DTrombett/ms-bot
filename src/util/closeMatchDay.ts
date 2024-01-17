import { Env, Leaderboard, MatchesData } from ".";

export const closeMatchDay = async (
	env: Env,
	leaderboard: Leaderboard,
	matches: Extract<MatchesData, { success: true }>["data"],
	day: number,
) => {
	const query = env.DB.prepare(`UPDATE Users
SET dayPoints = COALESCE(dayPoints, 0) + ?1,
	matchPointsHistory = COALESCE(matchPointsHistory, "${",".repeat(
		day - 2,
	)}") || ?2
WHERE id = ?3`);

	return env.DB.batch([
		...leaderboard.map(([user, matchPoints, dayPoints]) =>
			query.bind(dayPoints, `,${matchPoints}`, user.id),
		),
		env.DB.prepare(
			`DELETE FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
		).bind(...matches.map((m) => m.match_id)),
		env.DB.prepare(
			`DELETE FROM MatchDays
WHERE day = ?1`,
		).bind(day),
	]);
};
