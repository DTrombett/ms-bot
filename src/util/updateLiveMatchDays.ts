import {
	Routes,
	type RESTPatchAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { closeMatchDay } from "./closeMatchDay";
import { getLiveEmbed } from "./getLiveEmbed";
import { getPredictionsData } from "./getPredictionsData";
import { resolveLeaderboard } from "./resolveLeaderboard";
import { rest } from "./rest";
import { startPredictions } from "./startPredictions";
import { MatchStatus, type Env, type MatchDay } from "./types";

export const updateLiveMatchDays = async (matchDays: MatchDay[], env: Env) => {
	if (!matchDays.length) return;
	const liveMatchDays = await env.KV.get("liveMatchDays");
	const resolvedLive = liveMatchDays?.split(",").map((day) => {
		const [categoryId, messageId, nextUpdate] = day.split(":");

		return { categoryId, messageId, nextUpdate };
	});
	let changed!: boolean;

	await Promise.all(
		matchDays.map(async (matchDay) => {
			const found = resolvedLive?.find(
				(day) => day.categoryId === matchDay.id_category.toString(),
			);

			if (found) {
				if (Date.now() <= Number(found.nextUpdate)) {
					console.log(`Skipping match day`, found);
					return;
				}
				console.log(`Updating match day`, found);
				const [users, matches] = await getPredictionsData(
					env,
					parseInt(found.categoryId!),
				).catch((err) => {
					console.error(err);
					return [];
				});

				if (!(matches as any)) return;
				const finished = matches.every(
					(match) => match.match_status === MatchStatus.Finished,
				);
				const match = matches.find(
					(m) =>
						m.match_status === MatchStatus.Live ||
						m.match_status === MatchStatus.ToBePlayed,
				);
				const leaderboard = resolveLeaderboard(users, matches);

				if (match?.match_status === MatchStatus.ToBePlayed) {
					const newNextUpdate = Date.parse(match.date_time).toString();

					if (newNextUpdate !== found.nextUpdate) {
						found.nextUpdate = newNextUpdate;
						changed ||= true;
					}
				}
				await rest.patch(
					Routes.channelMessage(env.PREDICTIONS_CHANNEL, found.messageId!),
					{
						body: {
							embeds: getLiveEmbed(
								users,
								matches,
								leaderboard,
								parseInt(matches[0]!.match_day_order),
								finished,
							),
						} satisfies RESTPatchAPIChannelMessageJSONBody,
					},
				);
				if (finished) {
					console.log(`Closing match day`, found);
					changed ||= true;
					resolvedLive?.splice(resolvedLive.indexOf(found), 1);
					await closeMatchDay(
						env,
						leaderboard,
						matches,
						parseInt(matches[0]!.match_day_order),
					);
				}
				return;
			}
			console.log(`Starting match day`, matchDay);
			const newMatch = await startPredictions(
				env,
				parseInt(matchDay.description),
				matchDay.id_category,
			);

			changed ||= true;
			resolvedLive?.push(newMatch);
		}),
	);
	if (changed)
		await env.KV.put(
			"liveMatchDays",
			resolvedLive!
				.map((l) => [l.categoryId, l.messageId, l.nextUpdate].join(":"))
				.join(","),
		);
};

export default updateLiveMatchDays;
