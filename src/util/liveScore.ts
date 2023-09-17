import { Colors, EmbedBuilder, Message } from "discord.js";
import { env } from "node:process";
import { setInterval } from "node:timers/promises";
import { request } from "undici";
import { Document, MatchDay, User } from "../models";
import CustomClient from "./CustomClient";
import normalizeTeamName from "./normalizeTeamName";
import { MatchesData } from "./types";

const resolveMatches = (matches: Extract<MatchesData, { success: true }>) =>
	matches.data
		.map(
			(match) =>
				`- ${match.match_status === 1 ? "🔴 " : ""}${normalizeTeamName(
					match.home_team_name,
				)} - ${normalizeTeamName(match.away_team_name)}: ${
					match.match_status === 0
						? `<t:${Math.round(new Date(match.date_time).getTime() / 1_000)}:F>`
						: `**${match.home_goal} - ${match.away_goal}**`
				}`,
		)
		.join("\n");
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

						if (!found || found.match_status === 0) return points;
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
				`${i}. <@${user._id}>: **${points}** Punt${
					points === 1 ? "o" : "i"
				} Partita`,
		)
		.join("\n");
const closeMatchDay = (
	message: Message,
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
	matchDay: Document<typeof MatchDay>,
) => {
	matchDay.finished = true;
	return Promise.all([
		message.edit({
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
		}),
		matchDay.save(),
	]);
};
const loadMatches = async (matchDayId: number) =>
	(await request(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${matchDayId}`,
	).then((res) => res.body.json())) as MatchesData;

export const liveScore = async (client: CustomClient) => {
	const [users, matchDay, channel] = await Promise.all([
		User.find({
			predictions: { $exists: true, $type: "array", $ne: [] },
		}),
		MatchDay.findOne({}).sort("-day"),
		client.channels.fetch(env.PREDICTIONS_CHANNEL!),
	]);

	if (!matchDay) {
		CustomClient.printToStderr("No match day found!");
		return;
	}
	if (matchDay.finished! || !users.length) return;
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if (!channel?.isTextBased() || channel.isDMBased()) {
		CustomClient.printToStderr("Invalid predictions channel!");
		return;
	}
	let matches = await loadMatches(matchDay._id);

	if (!matches.success) {
		CustomClient.printToStderr(matches.message);
		CustomClient.printToStderr(matches.errors);
		return;
	}
	const embeds = [
		new EmbedBuilder()
			.setThumbnail(
				"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png",
			)
			.setTitle(`🔴 Risultati Live ${matchDay.day}° Giornata`)
			.setDescription(resolveMatches(matches))
			.setAuthor({
				name: "Serie A TIM",
				url: "https://legaseriea.it/it/serie-a",
			})
			.setColor("Red"),
		new EmbedBuilder()
			.setThumbnail(
				"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png",
			)
			.setTitle(`🔴 Classifica Live Pronostici ${matchDay.day}° Giornata`)
			.setDescription(resolveLeaderboard(users, matches))
			.setFooter({ text: "Ultimo aggiornamento" })
			.setAuthor({
				name: "Serie A TIM",
				url: "https://legaseriea.it/it/serie-a",
			})
			.setColor("Blue")
			.setTimestamp(),
	];
	const message = await (matchDay.messageId == null
		? channel.send({ embeds })
		: channel.messages.fetch(matchDay.messageId));

	if (matchDay.messageId == null) {
		matchDay.messageId = message.id;
		matchDay.save().catch(CustomClient.printToStderr);
	} else if (
		embeds.some((d, i) => d.data.description !== message.embeds[i]?.description)
	)
		message.edit({ embeds }).catch(CustomClient.printToStderr);
	let waitUntil = 0;

	if (matches.data.every((match) => match.match_status !== 1)) {
		const next = matches.data.find((match) => match.match_status === 0);

		if (next) waitUntil = new Date(next.date_time).getTime();
		else {
			await closeMatchDay(message, users, matches, matchDay);
			return;
		}
	}
	for await (const _ of setInterval(1_000 * 60)) {
		if (Date.now() < waitUntil) continue;
		const tempMatches = await loadMatches(matchDay._id);

		if (tempMatches.success) {
			matches = tempMatches;
			const newDescriptions = [
				resolveMatches(matches),
				resolveLeaderboard(users, matches),
			];

			if (newDescriptions.some((d, i) => d !== embeds[i].data.description)) {
				embeds[0].setDescription(newDescriptions[0]);
				embeds[1].setDescription(newDescriptions[1]).setTimestamp();
				message.edit({ embeds }).catch(CustomClient.printToStderr);
			}
			if (matches.data.every((match) => match.match_status !== 1)) {
				const next = matches.data.find((match) => match.match_status === 0);

				if (next) waitUntil = new Date(next.date_time).getTime();
				else {
					await closeMatchDay(message, users, matches, matchDay);
					break;
				}
			}
		}
	}
};

export default liveScore;
