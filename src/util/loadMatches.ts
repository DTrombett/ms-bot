import { env } from "cloudflare:workers";

export const loadMatches = async (id: string) => {
	const { matches } = await fetch(
		`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${
			env.SEASON_ID
		}/matches?matchDayId=${encodeURIComponent(id)}`,
	).then((res) =>
		res.ok
			? res.json<MatchesData>()
			: Promise.reject(
					new Error(
						`Couldn't load matches data: ${res.status} ${res.statusText}`,
					),
			  ),
	);

	return matches;
};
