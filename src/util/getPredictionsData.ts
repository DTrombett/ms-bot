import { Env, Prediction, User, type MatchData } from ".";

export const getPredictionsData = async (env: Env, matches: MatchData[]) => {
	const [{ results: predictions }, { results: rawUsers }] = (await env.DB.batch(
		[
			env.DB.prepare(
				`SELECT *
FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
			).bind(...matches.map((m) => m.id)),
			env.DB.prepare(`SELECT *
FROM Users
ORDER BY dayPoints DESC`),
		],
	)) as [D1Result<Prediction>, D1Result<User>];

	return rawUsers
		.map((user) => ({
			...user,
			predictions: predictions.filter((p) => p.userId === user.id),
		}))
		.filter((u) => u.predictions.length || u.dayPoints != null);
};
