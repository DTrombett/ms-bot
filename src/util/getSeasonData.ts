import { env } from "cloudflare:workers";
import { getMatchDayNumber } from "./getMatchDayNumber.ts";
import { loadMatches } from "./loadMatches.ts";
import { TimeUnit } from "./time.ts";

export const getSeasonData = async (userId: string, day?: number) => {
	const { matchdays } = await fetch(
		`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${env.SEASON_ID}/matchdays`,
	).then((res) =>
		res.ok
			? res.json<SeasonResponse>()
			: Promise.reject(
					new Error(
						`Couldn't load season data: ${res.status} ${res.statusText}`,
					),
			  ),
	);
	let matchDayData: MatchDay | undefined;
	let matches: Match[] | undefined;
	if (day) matchDayData = matchdays.find((d) => getMatchDayNumber(d) === day);
	else {
		// Check playing match day first
		const today = new Date().getUTCDate();
		const liveMatchDay = matchdays.findLast(
			(d) =>
				d.matchdayStatus === "Playing" &&
				new Date(d.startDateUtc).getUTCDate() === today,
		);

		if (liveMatchDay) {
			const liveMatches = await loadMatches(liveMatchDay.matchSetId);

			// If the first match hasn't started yet (more than 5 minutes from now), use LIVE day
			if (
				liveMatches.length &&
				Date.parse(liveMatches[0]!.matchDateUtc) >
					Date.now() + TimeUnit.Minute * 5
			) {
				matchDayData = liveMatchDay;
				matches = liveMatches;
			}
		}
		// Otherwise, use to be played day
		matchDayData ??= matchdays.find((d) => d.matchdayStatus === "Fixture");
	}
	if (!matchDayData) return [];
	matches ??= await loadMatches(matchDayData.matchSetId);
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
		.bind(userId, ...matches.map((m) => m.matchId))
		.all<Pick<Prediction, "matchId" | "prediction"> & Pick<User, "match">>();

	return [matchDayData, matches, existingPredictions] as const;
};
