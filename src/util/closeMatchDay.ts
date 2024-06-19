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
WHERE id = ?3`);

	return Promise.all([
		env.DB.batch([
			...leaderboard.map(([user, matchPoints, dayPoints]) =>
				query.bind(dayPoints, matchPoints, user.id),
			),
			env.DB.prepare(
				`DELETE FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
			).bind(...matches.map((m) => m.id)),
		]),
		env.KV.put(`matchDayMessage-${matches[0]!.matchday.id}`, "-", {
			metadata: "Infinity",
		}),
	]);
};
