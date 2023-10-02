import { EmbedBuilder, GuildTextBasedChannel, Message } from "discord.js";
import ms from "ms";
import { setTimeout as setPromiseTimeout } from "node:timers/promises";
import { WebSocket } from "undici";
import { Document, MatchDay, User } from "../models";
import loadMatches from "./loadMatches";
import { printToStderr, printToStdout } from "./logger";
import normalizeTeamName from "./normalizeTeamName";
import { MatchesData } from "./types";

type Leaderboard = [
	user: Document<typeof User>,
	matchPoints: number,
	dayPoints: number,
	maxPoints: number,
][];

const positionDayPoints = [3, 2, 1];
const finalEmojis: Record<number, string | undefined> = {
	[-2]: "⏬",
	[-1]: "⬇️",
	0: "➖",
	1: "⬆️",
	2: "⏫",
};

const resolveMatches = (matches: Extract<MatchesData, { success: true }>) =>
	matches.data
		.map(
			(match) =>
				`- ${match.match_status === 1 ? "🔴 " : ""}[${normalizeTeamName(
					match.home_team_name,
				)} - ${normalizeTeamName(match.away_team_name)}](https://legaseriea.it${
					match.slug
				}): ${
					match.match_status === 0
						? `<t:${Math.round(new Date(match.date_time).getTime() / 1_000)}:F>`
						: `**${match.home_goal ?? 0} - ${match.away_goal ?? 0}**`
				}`,
		)
		.join("\n");
const resolveLeaderboard = (
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
) => {
	let lastIndex = 0;
	const leaderboard = users
		.map((user): Leaderboard[number] => {
			let maxPoints = 0;

			return [
				user,
				matches.data.reduce((points, match) => {
					const teams =
						`${match.home_team_name} - ${match.away_team_name}`.toLowerCase();
					const matched = user.predictions
						?.find((p) => teams === p.teams.toLowerCase())
						?.prediction.match(
							/(?<type>(X|1|2){1,2})( \((?<home>(?<=\()\d+) - (?<away>\d+(?=\))))?/,
						)?.groups;

					if (!matched) {
						maxPoints--;
						return points - 1;
					}
					match.home_goal ??= 0;
					match.away_goal ??= 0;
					const { type, home, away } = matched as {
						type: "1" | "1X" | "2" | "12" | "X" | "X2";
						home?: `${number}`;
						away?: `${number}`;
					};
					const result =
						match.home_goal > match.away_goal
							? "1"
							: match.home_goal < match.away_goal
							? "2"
							: "X";
					let diffPoints = 0;
					const toBePlayed = match.match_status === 0;

					if (!toBePlayed)
						if (type === result)
							if (
								home != null &&
								Number(home) === match.home_goal &&
								Number(away) === match.away_goal
							)
								diffPoints = 3;
							else diffPoints = 2;
						else if (type.includes(result)) diffPoints = 1;
						else if (type.length === 2) diffPoints = -1;
					if (match.match_status === 2) maxPoints += diffPoints;
					else if (home != null)
						if (
							toBePlayed ||
							(match.home_goal <= Number(home) &&
								match.away_goal <= Number(away))
						)
							maxPoints += 3;
						else maxPoints += 2;
					else if (type.length === 1) maxPoints += 2;
					else maxPoints++;
					return toBePlayed ? points : points + diffPoints;
				}, 0),
				0,
				maxPoints,
			];
		})
		.sort((a, b) => b[1] - a[1]);
	const last = leaderboard.at(-1)!;

	for (let i = 0; i < leaderboard.length; i++) {
		const [, points] = leaderboard[i];
		const toAdd =
			positionDayPoints[leaderboard.findIndex(([, p]) => points === p)];

		if (!toAdd) break;
		leaderboard[i][2] = toAdd;
		lastIndex = i;
	}
	if (leaderboard.length - lastIndex > 1 && last[1] !== leaderboard.at(-2)![1])
		last[2] = -1;
	return leaderboard;
};
const createLeaderboardDescription = (
	leaderboard: Leaderboard,
	final = false,
) => {
	const highestMatchPoints = leaderboard.reduce(
		(highest, [{ matchPointsHistory }]) =>
			matchPointsHistory?.reduce((h, p) => (p > h ? p : h), highest) ?? highest,
		-Infinity,
	);

	return [...leaderboard]
		.sort((a, b) => b[1] - a[1])
		.map(([user, points, , maxPoints]) => {
			const position = leaderboard.findIndex(([, p]) => points === p) + 1;
			const matchPointsHistory =
				user.matchPointsHistory?.filter((n: number | null) => n != null) ?? [];

			return `${position}\\. <@${user._id}>: **${points}** Punt${
				points === 1 ? "o" : "i"
			} Partita ${
				final
					? `(avg. ${(
							(matchPointsHistory.reduce((a, b) => a + b, 0) + points) /
							(matchPointsHistory.length + 1)
					  ).toFixed(2)})`
					: `(max. ${maxPoints})`
			}${
				position === 1 && points > highestMatchPoints
					? " ✨"
					: !(
							user.matchPointsHistory &&
							user.matchPointsHistory.some((p) => p >= points)
					  )
					? " 🔥"
					: ""
			}`;
		})
		.join("\n");
};
const createFinalLeaderboard = (leaderboard: Leaderboard) => {
	const oldLeaderboard = [...leaderboard].sort(
		(a, b) => (b[0].dayPoints ?? 0) - (a[0].dayPoints ?? 0),
	);

	return [...leaderboard]
		.sort(
			(a, b) => (b[0].dayPoints ?? 0) + b[2] - ((a[0].dayPoints ?? 0) + a[2]),
		)
		.map(([user, , points], _i, array) => {
			const newPoints = (user.dayPoints ?? 0) + points;
			const newPosition = array.findIndex(
				([u, , p]) => (u.dayPoints ?? 0) + p === newPoints,
			);
			const oldPosition = oldLeaderboard.findIndex(
				([u]) => u.dayPoints === user.dayPoints,
			);
			const diff = oldPosition - newPosition;

			return `${newPosition + 1}\\. <@${user._id}>: **${newPoints}** Punt${
				Math.abs(newPoints) === 1 ? "o" : "i"
			} Giornata ${finalEmojis[diff] ?? finalEmojis[diff > 0 ? 2 : -2]}`;
		})
		.join("\n");
};
const closeMatchDay = (
	message: Message,
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
	matchDay: Document<typeof MatchDay>,
	embeds: EmbedBuilder[],
) => {
	const leaderboard = resolveLeaderboard(users, matches);
	const finalLeaderboard = createFinalLeaderboard(leaderboard);
	const leaderboardDescription = createLeaderboardDescription(
		leaderboard,
		true,
	);

	matchDay.finished = true;
	for (const [user, matchPoints, dayPoints] of leaderboard) {
		(user.matchPointsHistory ??= new Array(matchDay.day - 1)).push(matchPoints);
		if (dayPoints) user.dayPoints = (user.dayPoints ?? 0) + dayPoints;
	}
	return Promise.all([
		message.edit({
			embeds: [
				embeds[0]
					.setTitle(`Risultati Finali ${matchDay.day}° Giornata`)
					.setDescription(leaderboardDescription),
				embeds[1]
					.setTitle(
						`⚽ Classifica Definitiva Pronostici ${matchDay.day}° Giornata`,
					)
					.setFields({
						name: "Classifica Generale",
						value: finalLeaderboard,
					}),
			],
		}),
		matchDay.save(),
		...leaderboard.map(([user]) => user.save()),
	]);
};
const startWebSocket = (
	matches: Extract<MatchesData, { success: true }>,
	users: Document<typeof User>[],
	embeds: EmbedBuilder[],
	message: Message,
	matchDay: Document<typeof MatchDay>,
) => {
	let resolve: (value: PromiseLike<void> | void) => void;
	let timeout: NodeJS.Timeout | undefined;
	let lastPing = Date.now();
	let pingInterval: number;
	const ws = new WebSocket(
		"wss://www.legaseriea.it/socket.io/?EIO=4&transport=websocket",
	);

	ws.addEventListener("open", () => {
		printToStdout(`[${new Date().toISOString()}] Waiting for ping.`);
	});
	ws.addEventListener("close", (event) => {
		printToStderr(
			`[${new Date().toISOString()}] WebSocket closed with code ${
				event.code
			} and reason ${event.reason}`,
		);
	});
	ws.addEventListener("message", async (event) => {
		const type = parseInt(event.data);
		const start = type.toString().length;
		const data:
			| {
					sid: string;
					upgrades: [];
					pingInterval: number;
					pingTimeout: number;
					maxPayload: number;
			  }
			| [string, string]
			| undefined =
			(event.data as string).length === start
				? undefined
				: JSON.parse((event.data as string).slice(start));

		if (type === 0) {
			if (!data || !("pingInterval" in data)) return;
			ws.send("40");
			({ pingInterval } = data);
			timeout ??= setTimeout(() => {
				if (
					ws.readyState === WebSocket.CLOSED ||
					ws.readyState === WebSocket.CLOSING
				)
					return;
				printToStderr(
					`[${new Date().toISOString()}] Didn't receive ping in time. Trying to restart the websocket...`,
				);
				ws.close(1002);
				resolve(startWebSocket(matches, users, embeds, message, matchDay));
			}, pingInterval + data.pingTimeout);
			printToStdout(`[${new Date().toISOString()}] Live scores ready.`);
		} else if (type === 2) {
			ws.send("3");
			timeout?.refresh();
			printToStdout(
				`[${new Date().toISOString()}] Ping acknowledged, latency of ${
					-lastPing + (lastPing = Date.now()) - pingInterval
				}ms.`,
			);
		} else if (type === 42) {
			if (!Array.isArray(data) || data[0] !== "callApi") return;
			const updateData: {
				ora: string;
				match_id: number;
				away_goal: number;
				home_goal: number;
				match_day_id: number;
				match_status: number;
			}[] = JSON.parse(data[1]);

			printToStdout(`[${new Date().toISOString()}] Received updated data.`);
			printToStdout(updateData);
			for (const update of updateData) {
				const found = matches.data.find(
					(match) => match.match_id === update.match_id,
				);

				if (!found) continue;
				found.away_goal = update.away_goal;
				found.home_goal = update.home_goal;
				found.match_status = update.match_status;
			}
			const leaderboard = resolveLeaderboard(users, matches);

			embeds[0].setDescription(resolveMatches(matches));
			embeds[1]
				.setDescription(createLeaderboardDescription(leaderboard))
				.setTimestamp()
				.setFields({
					name: "Classifica Generale Provvisoria",
					value: createFinalLeaderboard(leaderboard),
				});
			message.edit({ embeds }).catch(printToStderr);
			if (matches.data.every((match) => match.match_status !== 1)) {
				const next = matches.data.find((match) => match.match_status === 0);

				if (next) {
					const delay = new Date(next.date_time).getTime() - Date.now();

					if (delay > 1_000) {
						ws.close(1000);
						printToStdout(
							`[${new Date().toISOString()}] No match live. Waiting for the next match in ${ms(
								delay,
							)}.`,
						);
						await setPromiseTimeout(delay);
						resolve(
							startWebSocket(
								await loadMatches(matchDay._id),
								users,
								embeds,
								message,
								matchDay,
							),
						);
						return;
					}
				} else {
					ws.close(1001);
					printToStdout(
						`[${new Date().toISOString()}] All matches ended. Marking match day as finished.`,
					);
					await closeMatchDay(message, users, matches, matchDay, embeds);
					resolve();
					return;
				}
			}
			printToStdout(`[${new Date().toISOString()}] Matches data updated.`);
		}
	});
	return new Promise<void>((res) => {
		resolve = res;
	});
};

export const liveScore = async (
	matchDay: Document<typeof MatchDay>,
	channel: GuildTextBasedChannel,
) => {
	const users = await User.find({
		$or: [
			{ predictions: { $exists: true, $type: "array", $ne: [] } },
			{ dayPoints: { $exists: true, $ne: null } },
		],
	}).sort({ dayPoints: -1 });

	if (!users.length || !users.find((u) => u.predictions?.length)) {
		matchDay.finished = true;
		await matchDay.save();
		return;
	}
	let matches = await loadMatches(matchDay._id);
	const leaderboard = resolveLeaderboard(users, matches);
	const embeds = [
		new EmbedBuilder()
			.setThumbnail(
				"https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
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
				"https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
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
		await matchDay.save();
	} else if (
		embeds.some(
			(d, i) => d.data.description !== message.embeds[i]?.description,
		) ||
		embeds[1].data.fields?.[0].value !== message.embeds[1]?.fields[0].value
	)
		message.edit({ embeds }).catch(printToStderr);
	if (matches.data.every((match) => match.match_status !== 1)) {
		const next = matches.data.find((match) => match.match_status === 0);

		if (next) {
			const delay = new Date(next.date_time).getTime() - Date.now();

			if (delay > 1_000) {
				printToStdout(
					`[${new Date().toISOString()}] No match live. Waiting for the next match in ${ms(
						delay,
					)}.`,
				);
				await setPromiseTimeout(delay);
				matches = await loadMatches(matchDay._id);
			}
		} else {
			await closeMatchDay(message, users, matches, matchDay, embeds);
			return;
		}
	}
	await startWebSocket(matches, users, embeds, message, matchDay);
};

export default liveScore;
