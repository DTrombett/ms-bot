import { MatchesData } from ".";

export const loadMatches = async (matchDayId?: string, teamId?: string) => {
	const matches = (await fetch(
		`https://match.uefa.com/v5/matches?competitionId=3&fromDate=2024-06-13&limit=500&offset=0&order=ASC${matchDayId ? `&matchDayId=${matchDayId}` : ""}${teamId ? `&teamId=${teamId}` : ""}`,
	).then((res) => res.json())) as MatchesData;

	if ("error" in matches)
		throw new Error(`Couldn't load matches data: ${matches.error.message}`);
	return matches;
};
