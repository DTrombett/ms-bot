import {
	Routes,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import {
	Env,
	Leaderboard,
	createMatchDayComponents,
	loadMatches,
	rest,
	type MatchData,
} from ".";

export const closeMatchDay = async (
	env: Env,
	leaderboard: Leaderboard,
	matches: MatchData[],
) => {
	const query = env.DB.prepare(`UPDATE Users
SET dayPoints = COALESCE(dayPoints, 0) + ?1,
	matchPointsHistory = CASE
		WHEN matchPointsHistory IS NULL THEN ?2
		ELSE matchPointsHistory || "," || ?2
	END
WHERE id = ?3`);
	const [allMatches] = await Promise.all([
		loadMatches(),
		env.DB.batch([
			...leaderboard.map(([user, matchPoints, dayPoints]) =>
				query.bind(dayPoints, matchPoints, user.id),
			),
			env.DB.prepare(
				`DELETE FROM Predictions
WHERE matchId IN (${Array(matches.length).fill("?").join(", ")})`,
			).bind(...matches.map((m) => m.id)),
		]),
	]);

	return Promise.all([
		env.KV.delete("currentMatchDay"),
		rest.post(Routes.channelMessages(env.PREDICTIONS_CHANNEL), {
			body: {
				content: `**Giornata terminata!** <@&${env.PREDICTIONS_ROLE}>\nPotete inviare i pronostici per le prossime giornate tramite i pulsanti qui sotto. Avete tempo fino a 15 minuti prima dell'inizio di ciascuna giornata!`,
				components: createMatchDayComponents(allMatches),
			} satisfies RESTPostAPIChannelMessageJSONBody,
		}),
	]);
};
