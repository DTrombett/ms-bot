import { env } from "cloudflare:workers";
import { getMatchDayNumber } from "./getMatchDayNumber";
import { loadMatches } from "./loadMatches";
import { TimeUnit } from "./time";

export const fetchMatchDays = async (): Promise<MatchDay[]> => {
	const res = await fetch(
		`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${env.SEASON_ID}/matchdays`,
	);
	if (!res.ok)
		throw new Error(
			`Couldn't load season data: ${res.status} ${res.statusText}`,
		);
	const { matchdays } = await res.json<SeasonResponse>();

	return matchdays;
};
export const getSeasonData = async (userId: string, day?: number) => {
	const matchdays = await fetchMatchDays();
	let matchDayData: MatchDay | undefined;
	let matches: Match[] | undefined;
	if (day) matchDayData = matchdays.find((d) => getMatchDayNumber(d) === day);
	else {
		// Check playing match day first
		const today = new Date().getUTCDate();
		const liveMatchDay = matchdays.findLast(
			(d) =>
				(d.matchdayStatus === "Playing" ||
					d.matchdayStatus === "Partially Played") &&
				new Date(d.startDateUtc).getUTCDate() === today,
		);

		if (liveMatchDay) {
			const liveMatches = await loadMatches(liveMatchDay.matchSetId);

			// If the first match hasn't started yet (more than 5 minutes from now), use LIVE day
			if (
				liveMatches[0] &&
				Date.parse(liveMatches[0].matchDateUtc) >
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
		`
			SELECT p.matchId, p.prediction, u.match FROM Predictions p
			JOIN Users u ON p.userId = u.id WHERE u.id = ? AND p.matchId IN
				(${Array(matches.length).fill("?").join(", ")})
		`,
	)
		.bind(userId, ...matches.map((m) => m.matchId))
		.run<
			Pick<Database.Prediction, "matchId" | "prediction"> &
				Pick<Database.User, "match">
		>();

	return [matchDayData, matches, existingPredictions] as const;
};
