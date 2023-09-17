import { EmbedBuilder, Message } from "discord.js";
import { env } from "node:process";
import { setInterval } from "node:timers/promises";
import { request } from "undici";
import { Document, MatchDay, User } from "../models";
import CustomClient from "./CustomClient";
import normalizeTeamName from "./normalizeTeamName";
import { MatchesData } from "./types";

const dayPoints = [3, 2, 1];
const loadMatches = async (matchDayId: number) =>
	(await request(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${matchDayId}`,
	).then((res) => res.body.json())) as MatchesData;
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
) => {
	let lastIndex = 0;
	const leaderboard = users
		.map(
			(
				user,
			): [
				user: Document<typeof User>,
				matchPoints: number,
				dayPoints: number,
			] => [
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
				0,
			],
		)
		.sort((a, b) => b[1] - a[1]);

	for (let i = 0; i < leaderboard.length; i++) {
		const [, points] = leaderboard[i];
		const toAdd = dayPoints[leaderboard.findIndex(([, p]) => points === p)];

		if (!toAdd) break;
		leaderboard[i][2] = toAdd;
		lastIndex = i;
	}
	if (leaderboard.length - lastIndex > 1) leaderboard.at(-1)![2] = -1;
	return leaderboard;
};
const createLeaderboardDescription = (
	leaderboard: [Document<typeof User>, number, number][],
) =>
	leaderboard
		.map(
			([user, points]) =>
				`${leaderboard.findIndex(([, p]) => points === p) + 1}\\. <@${
					user._id
				}>: **${points}** Punt${points === 1 ? "o" : "i"} Partita`,
		)
		.join("\n");
const createFinalLeaderboard = (
	leaderboard: [Document<typeof User>, number, number][],
) =>
	leaderboard
		.map(
			([user, , points]) =>
				`${leaderboard.findIndex(([, , p]) => points === p) + 1}\\. <@${
					user._id
				}>: **${points}** Punt${points === 1 ? "o" : "i"} Giornata`,
		)
		.join("\n");
const closeMatchDay = (
	message: Message,
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
	matchDay: Document<typeof MatchDay>,
) => {
	const leaderboard = resolveLeaderboard(users, matches);
	const toEdit = [];

	matchDay.finished = true;
	for (const [user, , points] of leaderboard)
		if (points) {
			user.dayPoints = (user.dayPoints ?? 0) + points;
			toEdit.push(user);
		}
	return Promise.all([
		message.edit({
			embeds: [
				new EmbedBuilder()
					.setThumbnail(
						"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png",
					)
					.setTitle(
						`⚽ Classifica Definitiva Pronostici ${matchDay.day}° Giornata`,
					)
					.setDescription(createLeaderboardDescription(leaderboard))
					.setFooter({ text: "Giornata terminata" })
					.addFields({
						name: "Classifica Generale",
						value: createFinalLeaderboard(leaderboard),
					})
					.setAuthor({
						name: "Serie A TIM",
						url: "https://legaseriea.it/it/serie-a",
					})
					.setColor("Blue")
					.setTimestamp(),
			],
		}),
		matchDay.save(),
		...toEdit.map((user) => user.save()),
	]);
};

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
	let leaderboard = resolveLeaderboard(users, matches);
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
			.setDescription(createLeaderboardDescription(leaderboard))
			.setFooter({ text: "Ultimo aggiornamento" })
			.addFields({
				name: "Classifica Generale Provvisoria",
				value: createFinalLeaderboard(leaderboard),
			})
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
			leaderboard = resolveLeaderboard(users, matches);
			const newDescriptions = [
				resolveMatches(matches),
				createLeaderboardDescription(leaderboard),
			];

			if (newDescriptions.some((d, i) => d !== embeds[i].data.description)) {
				embeds[0].setDescription(newDescriptions[0]);
				embeds[1].setDescription(newDescriptions[1]).setTimestamp();
				embeds[1].setFields({
					name: "Classifica Generale",
					value: createFinalLeaderboard(leaderboard),
				});
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
