import { env } from "node:process";
import { request } from "undici";
import { MatchDay } from "../models";
import { CustomClient, normalizeTeamName, setPermanentTimeout } from "../util";

export const loadMatches = async (client: CustomClient) => {
	try {
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
			return;
		}
		const matchDayData = matchDays.data.find(
			(d) =>
				d.category_status === "LIVE" || d.category_status === "TO BE PLAYED",
		);

		if (matchDayData == null) {
			CustomClient.printToStderr("No match to be played!");
			return;
		}
		const matches = (await request(
			`https://www.legaseriea.it/api/stats/live/match?match_day_id=${matchDayData.id_category}`,
		).then((res) => res.body.json())) as
			| {
					success: true;
					data: {
						home_team_name: Uppercase<string>;
						away_team_name: Uppercase<string>;
						date_time: string;
					}[];
			  }
			| { success: false; message: string; errors: unknown[] };

		if (!matches.success) {
			CustomClient.printToStderr(matches.message);
			CustomClient.printToStderr(matches.errors);
			return;
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

		await matchDay.save();
		let date = matchDay.matches[0].date - 1000 * 60 * 15;
		const [channel] = await Promise.all([
			client.channels.fetch(env.PREDICTIONS_CHANNEL!),
			setPermanentTimeout(client, {
				action: "loadMatches",
				date: matchDay.matches.at(-1)!.date + 1_000 * 60 * 60 * 24,
				options: [],
			}),
			setPermanentTimeout(client, {
				action: "sendPredictions",
				date,
				options: [matchDay.day],
			}),
		]);

		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (!channel?.isTextBased() || channel.isDMBased()) {
			CustomClient.printToStderr("Invalid predictions channel!");
			return;
		}
		date = Math.round(date / 1_000);
		await channel.send({
			content: `<@&${env.PREDICTIONS_ROLE!}>, potete ora inviare i pronostici per la prossima giornata! Per inviare i pronostici potete usare il comando \`/predictions add\` e seguire le istruzioni. Avete tempo fino a <t:${date}:F> (<t:${date}:R>)`,
		});
	} catch (err) {
		CustomClient.printToStderr(err);
	}
};
