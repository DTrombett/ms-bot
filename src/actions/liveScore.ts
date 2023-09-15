import { Colors, EmbedBuilder } from "discord.js";
import { env } from "node:process";
import { setInterval, setTimeout } from "node:timers/promises";
import { request } from "undici";
import { Document, MatchDay, User } from "../models";
import { CustomClient, MatchesData } from "../util";

const resolveLeaderboard = (
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
) =>
	users
		.map(
			(user) =>
				[
					user,
					user.predictions!.reduce((points, prediction) => {
						const teams = prediction.teams.toLowerCase();
						const found = matches.data.find(
							(match) =>
								`${match.home_team_name} - ${match.away_team_name}`.toLowerCase() ===
								teams,
						);

						if (!found) return points;
						const [type, home, away] = prediction.prediction.split(
							/( \(| - |\))/g,
						) as
							| ["1" | "1X" | "2" | "X" | "X2"]
							| ["1" | "2" | "X", `${number}`, `${number}`];
						const result =
							found.home_goal > found.away_goal
								? "1"
								: found.home_goal < found.away_goal
								? "2"
								: "X";

						if (type === result)
							if (
								home !== undefined &&
								Number(home) === found.home_goal &&
								Number(away) === found.away_goal
							)
								points += 3;
							else points += 2;
						else if (type.includes(result)) points++;
						else if (type.length === 2) points--;
						return points;
					}, 0),
				] as const,
		)
		.sort((a, b) => b[1] - a[1])
		.map(
			([user, points], i) =>
				`${i}. <@${user._id}>: **${points}** Punti Partita`,
		)
		.join("\n");
const loadMatches = async (matchDayId: number) =>
	(await request(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${matchDayId}`,
	).then((res) => res.body.json())) as MatchesData;

export const liveScore = async (client: CustomClient) => {
	const channel = await client.channels.fetch(env.PREDICTIONS_CHANNEL!);

	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if (!channel?.isTextBased() || channel.isDMBased()) {
		CustomClient.printToStderr("Invalid predictions channel!");
		return;
	}
	const [users, matchDay] = await Promise.all([
		User.find({
			predictions: { $exists: true, $type: "array", $ne: [] },
		}),
		MatchDay.findOne({}).sort("-day"),
	]);

	if (!matchDay) {
		CustomClient.printToStderr("No match day found!");
		return;
	}
	let matches = await loadMatches(matchDay._id);

	if (!matches.success) {
		CustomClient.printToStderr(matches.message);
		CustomClient.printToStderr(matches.errors);
		return;
	}
	const message = await (matchDay.messageId == null
		? channel.send({
				embeds: [
					{
						author: {
							name: "Serie A TIM",
							url: "https://legaseriea.it/it/serie-a",
						},
						color: Colors.Blue,
						description: resolveLeaderboard(users, matches),
						footer: { text: "Ultimo aggiornamento" },
						thumbnail: {
							url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png",
						},
						timestamp: new Date().toISOString(),
						title: `🔴 Classifica Live Pronostici ${matchDay.day}° Giornata`,
					},
				],
		  })
		: channel.messages.fetch(matchDay.messageId));

	if (matchDay.messageId == null) {
		matchDay.messageId = message.id;
		matchDay.save().catch(CustomClient.printToStderr);
	}
	for await (const _ of setInterval(1_000 * 60)) {
		const tempMatches = await loadMatches(matchDay._id);

		if (tempMatches.success) {
			matches = tempMatches;
			message
				.edit({
					embeds: [
						EmbedBuilder.from(message.embeds[0])
							.setDescription(resolveLeaderboard(users, matches))
							.setTimestamp(),
					],
				})
				.catch(CustomClient.printToStderr);
			if (matches.data.every((match) => match.match_status !== 1)) {
				const next = matches.data.find((match) => match.match_status === 0);

				if (next)
					await setTimeout(new Date(next.date_time).getTime() - Date.now());
				else break;
			}
		}
	}
	await message.edit({
		embeds: [
			{
				author: {
					name: "Serie A TIM",
					url: "https://legaseriea.it/it/serie-a",
				},
				color: Colors.Blue,
				description: resolveLeaderboard(users, matches),
				footer: { text: "Giornata terminata" },
				thumbnail: {
					url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png",
				},
				timestamp: new Date().toISOString(),
				title: `⚽ Classifica Finale Pronostici ${matchDay.day}° Giornata`,
			},
		],
	});
};
