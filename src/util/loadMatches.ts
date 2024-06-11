import { MatchesData } from ".";

export const loadMatches = async (matchDayId?: number | string) => {
	const matches = (await fetch(
		`https://match.uefa.com/v5/matches?competitionId=3&fromDate=2024-06-13&limit=500&offset=0&order=ASC${matchDayId ? `&matchDayId=${matchDayId}` : ""}`,
	).then((res) => res.json())) as MatchesData;

	if ("error" in matches)
		throw new Error(`Couldn't load matches data: ${matches.error.message}`);
	return matches;
};
