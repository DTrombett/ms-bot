import { REST } from "@discordjs/rest";
import { Env, Leaderboard } from ".";
import { loadMatchDay } from "./loadMatchDay";

export const closeMatchDay = async (
	api: REST,
	env: Env,
	leaderboard: Leaderboard,
	day: number,
) => {
	const [queries, promise] = await loadMatchDay(api, env);
	const query = env.DB.prepare(`UPDATE Users
SET dayPoints = COALESCE(dayPoints, 0) + ?1,
	matchPointsHistory = COALESCE(matchPointsHistory, "${",".repeat(
		day - 2,
	)}") || ?2
WHERE id = ?3`);

	return Promise.all([
		env.DB.batch([
			...leaderboard.map(([user, matchPoints, dayPoints]) =>
				query.bind(dayPoints, `,${matchPoints}`, user.id),
			),
			env.DB.prepare("DELETE FROM Predictions"),
			...queries,
		]),
		promise,
	]);
};
