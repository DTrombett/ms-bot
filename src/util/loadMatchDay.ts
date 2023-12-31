import { REST } from "@discordjs/rest";
import {
	RESTPostAPIChannelMessageJSONBody,
	Routes,
} from "discord-api-types/v10";
import { normalizeTeamName } from ".";
import { Env, MatchDay, MatchesData } from "./types";

export const loadMatchDay = async (api: REST, env: Env) => {
	const matchDays = (await fetch(
		"https://www.legaseriea.it/api/season/157617/championship/A/matchday",
	).then((res) => res.json())) as
		| {
				success: true;
				data: {
					category_status: "LIVE" | "PLAYED" | "TO BE PLAYED";
					description: `${number}`;
					id_category: number;
				}[];
		  }
		| { success: false; message: string; errors: unknown[] };

	if (!matchDays.success)
		throw new Error(`Couldn't load season data: ${matchDays.message}`, {
			cause: matchDays.errors,
		});
	const matchDayData = matchDays.data.find(
		(d) => d.category_status === "LIVE" || d.category_status === "TO BE PLAYED",
	);

	if (!matchDayData) return "No match to be played!";
	if (
		await env.DB.prepare(
			`SELECT 1
FROM MatchDays
WHERE id = ?
LIMIT 1`,
		)
			.bind(matchDayData.id_category)
			.first("1")
	)
		return "Match day already loaded!";
	const matches = await fetch(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${matchDayData.id_category}`,
	).then((res) => res.json() as Promise<MatchesData>);

	if (!matches.success)
		throw new Error(`Couldn't load matches data: ${matches.message}`, {
			cause: matches.errors,
		});
	if (!matches.data.length) throw new TypeError("No match found");
	const matchDay: MatchDay = {
		id: matchDayData.id_category,
		day: Number(matchDayData.description),
	};

	await env.DB.batch([
		env.DB.prepare("INSERT INTO MatchDays (id, day) VALUES (?1, ?2)").bind(
			matchDay.id,
			matchDay.day,
		),
		env.DB.prepare(
			`INSERT INTO Matches (id, dayId, matchDate, teams) VALUES ${"\n(?, ?, ?, ?),".repeat(
				matches.data.length,
			)}`.slice(0, -1),
		).bind(
			...matches.data.flatMap((m) => [
				m.match_id,
				matchDay.id,
				m.date_time,
				[m.home_team_name, m.away_team_name].map(normalizeTeamName).join(" - "),
			]),
		),
		env.DB.prepare("DELETE FROM Predictions"),
	]);
	const date = Math.round(
		(new Date(matches.data[0]!.date_time).getTime() - 1000 * 60 * 15) / 1_000,
	);

	if (date - Date.now() / 1_000 > 10)
		await api.post(Routes.channelMessages(env.PREDICTIONS_CHANNEL), {
			body: {
				content: `<@&${env.PREDICTIONS_ROLE}>, potete ora inviare i pronostici per la prossima giornata! Per inviare i pronostici potete usare il comando \`/predictions send\` e seguire le istruzioni. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)! Vi ricordo che potete aggiungere un promemoria valido per ogni giornata per ricordarvi di inviare i pronostici con il comando \`/predictions reminder\`.`,
			} satisfies RESTPostAPIChannelMessageJSONBody,
		});
	return "Done!";
};

export default loadMatchDay;
