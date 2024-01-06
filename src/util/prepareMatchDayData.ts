import { Env, MatchesData, Prediction, User, loadMatches } from ".";

export const prepareMatchDayData = async (
	env: Env,
	categoryId: number,
): Promise<
	[
		users: (User & { predictions: Prediction[] })[],
		matches: Extract<MatchesData, { success: true }>,
	]
> => {
	const [[{ results: predictions }, { results: rawUsers }], matches] =
		await Promise.all([
			env.DB.batch([
				env.DB.prepare(
					`SELECT *
FROM Predictions`,
				),
				env.DB.prepare(`SELECT *
FROM Users
ORDER BY dayPoints DESC`),
			]) as Promise<[D1Result<Prediction>, D1Result<User>]>,
			loadMatches(categoryId),
		]);
	return [
		rawUsers
			.map((user) => ({
				...user,
				predictions: predictions.filter((p) => p.userId === user.id),
			}))
			.filter((u) => u.predictions.length || u.dayPoints != null),
		matches,
	];
};
