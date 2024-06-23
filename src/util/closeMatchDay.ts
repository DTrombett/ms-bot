import { Env, Leaderboard, type MatchData } from ".";

export const closeMatchDay = async (
	env: Env,
	leaderboard: Leaderboard,
	matches: MatchData[],
) => {
	const query = env.DB.prepare(`UPDATE Users
SET dayPoints = COALESCE(dayPoints, 0) + ?1,
	matchPointsHistory = CASE
		WHEN matchPointsHistory IS NULL THEN ?2
		ELSE matchPointsHistory || "," || ?2
	END
WHERE id = ?3`);

	await env.DB.batch([
		...leaderboard.map(([user, matchPoints, dayPoints]) =>
			query.bind(dayPoints, matchPoints, user.id),
		),
		env.DB.prepare(
			`DELETE FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
		).bind(...matches.map((m) => m.id)),
	]);
	return env.KV.delete("currentMatchDay");
};
