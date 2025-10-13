import type { MatchesData } from "./index.ts";

export const loadMatches = async (id: number, limit?: number) => {
	const matches = (await fetch(
		`https://legaseriea.it/api/stats/live/match?match_day_id=${id}&order=oldest${limit ? `&limit=${limit}` : ""}`,
	).then((res) => res.json())) as MatchesData;

	if (!matches.success)
		throw new Error(`Couldn't load matches data: ${matches.message}`, {
			cause: matches.errors,
		});
	return matches.data;
};
