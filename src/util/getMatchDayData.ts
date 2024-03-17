import { Env, MatchDay, Prediction, loadMatches } from ".";

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
	Predictions.prediction
FROM Predictions
	JOIN Users ON Predictions.userId = Users.id
WHERE Users.id = ?
	AND Predictions.matchId IN (${Array(matches.length).fill("?").join(", ")})`,
	)
		.bind(userId, ...matches.map((m) => m.match_id))
		.all<Pick<Prediction, "matchId" | "prediction">>();

	matches.sort((a, b) =>
		new Date(a.date_time) > new Date(b.date_time) ? 1 : -1,
	);
	return [matchDay, matches, existingPredictions] as const;
};
