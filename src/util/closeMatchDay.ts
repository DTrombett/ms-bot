import { Env, Leaderboard, type Match } from ".";

export const closeMatchDay = async (
	env: Env,
	leaderboard: Leaderboard,
	matches: Match[],
	day: number,
) => {
	const query = env.DB.prepare(`UPDATE Users
SET dayPoints = COALESCE(dayPoints, 0) + ?1,
	matchPointsHistory = COALESCE(matchPointsHistory, "${",".repeat(
		day - 2,
	)}") || ?2,
	reminded = 0
WHERE id = ?3`);

	return env.DB.batch([
		...leaderboard.map(([user, matchPoints, dayPoints]) =>
			query.bind(dayPoints, `,${matchPoints}`, user.id),
		),
		env.DB.prepare(
			`DELETE FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
		).bind(...matches.map((m) => m.match_id)),
	]);
};
