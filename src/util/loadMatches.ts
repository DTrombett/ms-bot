import { request } from "undici";
import CustomClient from "./CustomClient";
import { MatchesData } from "./types";

export const loadMatches = async (id: number) => {
	const matches = (await request(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${id}`,
	).then((res) => res.body.json())) as MatchesData;

	if (!matches.success) {
		CustomClient.printToStderr(matches.message);
		CustomClient.printToStderr(matches.errors);
		throw new Error("Couldn't load matches data");
	}
	return matches;
};

export default loadMatches;
