import { env } from "cloudflare:workers";
import { getMatchDayNumber } from "./getMatchDayNumber.ts";
import { loadMatches } from "./loadMatches.ts";
import { TimeUnit } from "./time.ts";

export const getMatchDayData = async (userId: string, day?: number) => {
	const matchDays = (await fetch(
		`https://legaseriea.it/api/season/${env.SEASON_ID}/championship/A/matchday`,
	).then((res) => res.json())) as MatchDayResponse;

	if (!matchDays.success)
		throw new Error(`Couldn't load season data: ${matchDays.message}`, {
			cause: matchDays.errors,
		});
	let matchDayData: MatchDay | undefined;
	let matches: Match[] | undefined;
	if (day)
		matchDayData = matchDays.data.find((d) => getMatchDayNumber(d) === day);
	else {
		// Check LIVE match day first
		const liveMatchDay = matchDays.data.find(
			(d) => d.category_status === "LIVE",
		);
		if (liveMatchDay) {
			const liveMatches = await loadMatches(liveMatchDay.id_category);
			// If the first match hasn't started yet (more than 5 minutes from now), use LIVE day
			if (
				liveMatches.length &&
				Date.parse(liveMatches[0]!.date_time) > Date.now() + TimeUnit.Minute * 5
			) {
				matchDayData = liveMatchDay;
				matches = liveMatches;
			}
		}
		// Otherwise, use TO BE PLAYED day
		if (!matchDayData)
			matchDayData = matchDays.data.find(
				(d) => d.category_status === "TO BE PLAYED",
			);
	}

	if (!matchDayData) return [];
	if (!matches) matches = await loadMatches(matchDayData.id_category);

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
