import { MatchesData } from ".";

export const loadMatches = async (id: number) => {
	const matches = (await fetch(
		`https://legaseriea.it/api/stats/live/match?match_day_id=${id}&order=oldest`,
	).then((res) => res.json())) as MatchesData;

	if (!matches.success)
		throw new Error(`Couldn't load matches data: ${matches.message}`, {
			cause: matches.errors,
		});
	return matches.data;
};
