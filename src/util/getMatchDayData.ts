import { Env, MatchDay, Prediction, loadMatches } from ".";

export const getMatchDayData = async (env: Env, userId: string) => {
	const [
		{
			results: [matchDay],
		},
		{ results: existingPredictions },
	] = (await env.DB.batch([
		env.DB.prepare(
			`SELECT *
FROM MatchDays
WHERE day = (
		SELECT MAX(day)
		FROM MatchDays
	)`,
		),
		env.DB.prepare(
			`SELECT matchId,
	prediction
FROM Predictions
	JOIN Users ON Predictions.userId = Users.id
WHERE Users.id = ?`,
		).bind(userId),
	])) as [
		D1Result<MatchDay>,
		D1Result<Pick<Prediction, "matchId" | "prediction">>,
	];

	if (!matchDay?.categoryId) return [];
	const { data: matches } = await loadMatches(matchDay.categoryId);

	matches.sort((a, b) =>
		new Date(a.date_time) > new Date(b.date_time) ? 1 : -1,
	);
	return [matchDay, matches, existingPredictions] as const;
};
