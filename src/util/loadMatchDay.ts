import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import {
	ButtonStyle,
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
	const matchDay: MatchDay = {
		day: Number(matchDayData.description),
		categoryId: Number(matchDayData.id_category),
		startDate: "",
	};

	if (
		await env.DB.prepare(
			`SELECT 1
FROM MatchDays
WHERE day = ?
LIMIT 1`,
		)
			.bind(matchDay.day)
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
	matchDay.startDate = matches.data
		.reduce((time, match) => {
			const newTime = new Date(match.date_time);

			return time < newTime ? time : newTime;
		}, new Date(""))
		.toISOString();
	const date = Math.round(
		(new Date(matches.data[0]!.date_time).getTime() - 1000 * 60 * 15) / 1_000,
	);

	await Promise.all([
		env.DB.batch([
			env.DB.prepare(
				"INSERT INTO MatchDays (day, categoryId, startDate) VALUES (?1, ?2, ?3)",
			).bind(matchDay.day, matchDay.categoryId, matchDay.startDate),
			env.DB.prepare(
				`INSERT INTO Matches (id, day, matchDate, teams) VALUES ${"\n(?, ?, ?, ?),".repeat(
					matches.data.length,
				)}`.slice(0, -1),
			).bind(
				...matches.data.flatMap((m) => [
					m.match_id,
					matchDay.day,
					m.date_time,
					[m.home_team_name, m.away_team_name]
						.map(normalizeTeamName)
						.join(" - "),
				]),
			),
			env.DB.prepare("DELETE FROM Predictions"),
		]),
		date - Date.now() / 1_000 > 10 &&
			api.post(Routes.channelMessages(env.PREDICTIONS_CHANNEL), {
				body: {
					content: `<@&${env.PREDICTIONS_ROLE}>, potete inviare i pronostici per la prossima giornata!\nPer farlo potete inviare il comando \`/predictions send\` e seguire le istruzioni o premere il pulsante qui in basso. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)!`,
					components: [
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`predictions-${matchDay.day}-1`)
									.setEmoji({ name: "⚽" })
									.setLabel("Invia pronostici")
									.setStyle(ButtonStyle.Primary),
								new ButtonBuilder()
									.setCustomId("predictions-start")
									.setEmoji({ name: "▶️" })
									.setLabel("Inizia giornata")
									.setStyle(ButtonStyle.Primary),
							)
							.toJSON(),
					],
				} satisfies RESTPostAPIChannelMessageJSONBody,
			}),
	]);
	return "Done!";
};

export default loadMatchDay;
