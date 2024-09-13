import { Env, MatchDay, Prediction, loadMatches, type User } from ".";

export const getMatchDayData = async (
	env: Env,
	userId: string,
	day?: number,
) => {
	const matchDay = await env.DB.prepare(
		`SELECT *
FROM MatchDays
WHERE day = ${day ?? "(SELECT MAX(day) FROM MatchDays)"}`,
	).first<MatchDay>();

	if (!matchDay) return [];
	const matches = await loadMatches(matchDay.categoryId);

	if (!matches.length) return [];
	const { results: existingPredictions } = await env.DB.prepare(
		`SELECT Predictions.matchId,
	Predictions.prediction,
	Users.match
FROM Predictions
	JOIN Users ON Predictions.userId = Users.id
WHERE Users.id = ?
	AND Predictions.matchId IN (${Array(matches.length).fill("?").join(", ")})`,
	)
		.bind(userId, ...matches.map((m) => m.match_id))
		.all<Pick<Prediction, "matchId" | "prediction"> & Pick<User, "match">>();

	return [matchDay, matches, existingPredictions] as const;
};
