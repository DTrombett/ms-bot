import { GuildTextBasedChannel } from "discord.js";
import { env } from "node:process";
import { request } from "undici";
import { MatchDay, User } from "../models";
import CustomClient from "./CustomClient";
import normalizeTeamName from "./normalizeTeamName";
import { MatchesData } from "./types";

export const loadMatchDay = async (channel: GuildTextBasedChannel) => {
	const matchDays = (await request(
		"https://www.legaseriea.it/api/season/157617/championship/A/matchday",
	).then((res) => res.body.json())) as
		| {
				success: true;
				data: {
					category_status: "LIVE" | "PLAYED" | "TO BE PLAYED";
					description: `${number}`;
					id_category: number;
				}[];
		  }
		| { success: false; message: string; errors: unknown[] };

	if (!matchDays.success) {
		CustomClient.printToStderr(matchDays.message);
		CustomClient.printToStderr(matchDays.errors);
		throw new Error("Couldn't load season data");
	}
	const matchDayData = matchDays.data.find(
		(d) => d.category_status === "LIVE" || d.category_status === "TO BE PLAYED",
	);

	if (matchDayData == null) throw new Error("No match to be played!");
	const matches = (await request(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${matchDayData.id_category}`,
	).then((res) => res.body.json())) as MatchesData;

	if (!matches.success) {
		CustomClient.printToStderr(matches.message);
		CustomClient.printToStderr(matches.errors);
		throw new Error("Couldn't load matches data");
	}
	const matchDay = new MatchDay({
		_id: matchDayData.id_category,
		matches: matches.data.map((match) => ({
			date: new Date(match.date_time).getTime(),
			teams: [match.home_team_name, match.away_team_name]
				.map(normalizeTeamName)
				.join(" - "),
		})),
		day: Number(matchDayData.description),
	});
	let date = matchDay.matches[0].date - 1000 * 60 * 15;

	await Promise.all([
		matchDay.save(),
		User.updateMany(
			{
				predictions: { $exists: true, $type: "array", $ne: [] },
			},
			{ $unset: { predictions: 1 } },
		),
	]);
	date = Math.round(date / 1_000);
	if (date - Date.now() / 1_000 > 10)
		await channel.send({
			content: `<@&${env.PREDICTIONS_ROLE!}>, potete ora inviare i pronostici per la prossima giornata! Per inviare i pronostici potete usare il comando \`/predictions add\` e seguire le istruzioni. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)`,
		});
	return matchDay;
};

export default loadMatchDay;