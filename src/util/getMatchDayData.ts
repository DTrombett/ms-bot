import { env } from "cloudflare:workers";
import {
	Prediction,
	getMatchDayNumber,
	loadMatches,
	type MatchDayResponse,
	type User,
} from ".";

export const getMatchDayData = async (userId: string, day?: number) => {
	const matchDays = (await fetch(
		`https://legaseriea.it/api/season/${env.SEASON_ID}/championship/A/matchday`,
	).then((res) => res.json())) as MatchDayResponse;

	if (!matchDays.success)
		throw new Error(`Couldn't load season data: ${matchDays.message}`, {
			cause: matchDays.errors,
		});
	const matchDayData = matchDays.data.find(
		day
			? (d) => getMatchDayNumber(d) === day
			: (d) => d.category_status === "TO BE PLAYED",
	);

	if (!matchDayData) return [];
	const matches = await loadMatches(matchDayData.id_category);

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

	return [matchDayData, matches, existingPredictions] as const;
};
