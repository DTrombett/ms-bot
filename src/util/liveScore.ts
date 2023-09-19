import { EmbedBuilder, Message } from "discord.js";
import ms from "ms";
import { env } from "node:process";
import { setTimeout as setPromiseTimeout } from "node:timers/promises";
import { WebSocket, request } from "undici";
import { Document, MatchDay, User } from "../models";
import CustomClient from "./CustomClient";
import normalizeTeamName from "./normalizeTeamName";
import { MatchesData } from "./types";

type Leaderboard = [Document<typeof User>, number, number][];
const dayPoints = [3, 2, 1];
const loadMatches = (id: number) =>
	request(
		`https://www.legaseriea.it/api/stats/live/match?match_day_id=${id}`,
	).then((res) => res.body.json()) as Promise<MatchesData>;
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
				matches.data.reduce((points, match) => {
					if (match.match_status === 0) return points;
					const teams =
						`${match.home_team_name} - ${match.away_team_name}`.toLowerCase();
					const prediction = user.predictions?.find(
						(p) => teams === p.teams.toLowerCase(),
					);

					if (!prediction) return points - 1;
					const [type, home, away] = prediction.prediction.split(
						/( \(| - |\))/g,
					) as
						| ["1" | "1X" | "2" | "X" | "X2"]
						| ["1" | "2" | "X", `${number}`, `${number}`];
					const result =
						match.home_goal > match.away_goal
							? "1"
							: match.home_goal < match.away_goal
							? "2"
							: "X";

					if (type === result)
						if (
							home !== undefined &&
							Number(home) === match.home_goal &&
							Number(away) === match.away_goal
						)
							return points + 3;
						else return points + 2;
					if (type.includes(result)) return points + 1;
					if (type.length === 2) return points - 1;
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
	const last = leaderboard.at(-1)!;

	if (leaderboard.length - lastIndex > 1 && last[1] !== leaderboard.at(-2)![1])
		last[2] = -1;
	return leaderboard;
};
const createLeaderboardDescription = (leaderboard: Leaderboard) =>
	[...leaderboard]
		.sort((a, b) => b[1] - a[1])
		.map(
			([user, points]) =>
				`${leaderboard.findIndex(([, p]) => points === p) + 1}\\. <@${
					user._id
				}>: **${points}** Punt${points === 1 ? "o" : "i"} Partita`,
		)
		.join("\n");
const createFinalLeaderboard = (leaderboard: Leaderboard) =>
	[...leaderboard]
		.sort(
			(a, b) => (b[0].dayPoints ?? 0) + b[2] - ((a[0].dayPoints ?? 0) + a[2]),
		)
		.map(([user, , points], _i, array) => {
			const newPoints = (user.dayPoints ?? 0) + points;

			return `${
				array.findIndex(([u, , p]) => (u.dayPoints ?? 0) + p === newPoints) + 1
			}\\. <@${user._id}>: **${newPoints}** Punt${
				Math.abs(newPoints) === 1 ? "o" : "i"
			} Giornata`;
		})
		.join("\n");
const closeMatchDay = (
	message: Message,
	users: Document<typeof User>[],
	matches: Extract<MatchesData, { success: true }>,
	matchDay: Document<typeof MatchDay>,
	embeds: EmbedBuilder[],
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
				embeds[0].setTitle(`Risultati Finali ${matchDay.day}° Giornata`),
				embeds[1].setTitle(
					`⚽ Classifica Definitiva Pronostici ${matchDay.day}° Giornata`,
				),
			],
		}),
		matchDay.save(),
		...toEdit.map((user) => user.save()),
	]);
};
const startWebSocket = (
	matches: Extract<MatchesData, { success: true }>,
	users: Document<typeof User>[],
	embeds: EmbedBuilder[],
	message: Message,
	matchDay: Document<typeof MatchDay>,
) => {
	let timeout: NodeJS.Timeout | undefined;
	const ws = new WebSocket(
		"wss://www.legaseriea.it/socket.io/?EIO=4&transport=websocket",
	);

	ws.addEventListener("open", () => {
		CustomClient.printToStdout(
			`[${new Date().toISOString()}] Waiting for ping.`,
		);
	});
	ws.addEventListener("close", (event) => {
		CustomClient.printToStderr(
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
			timeout ??= setTimeout(() => {
				CustomClient.printToStderr(
					`[${new Date().toISOString()}] Didn't receive ping in time. Trying to restart the websocket...`,
				);
				ws.close(1014);
				startWebSocket(matches, users, embeds, message, matchDay);
			}, data.pingInterval + data.pingTimeout);
			CustomClient.printToStdout(
				`[${new Date().toISOString()}] Live scores ready.`,
			);
		} else if (type === 2) {
			ws.send("3");
			timeout?.refresh();
			CustomClient.printToStdout(
				`[${new Date().toISOString()}] Ping acknowledged.`,
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
			const newDescriptions = [
				resolveMatches(matches),
				createLeaderboardDescription(leaderboard),
			];

			if (matches.data.every((match) => match.match_status !== 1)) {
				const next = matches.data.find((match) => match.match_status === 0);

				if (next) {
					const delay = new Date(next.date_time).getTime() - Date.now();

					if (delay < 1_000) return;
					ws.close(1000);
					CustomClient.printToStdout(
						`[${new Date().toISOString()}] No match live. Waiting for the next match in ${ms(
							delay,
						)}.`,
					);
					await setPromiseTimeout(delay);
					const newMatches = await loadMatches(matchDay._id);

					startWebSocket(
						newMatches.success ? newMatches : matches,
						users,
						embeds,
						message,
						matchDay,
					);
				} else {
					ws.close(1001);
					CustomClient.printToStdout(
						`[${new Date().toISOString()}] All matches ended. Marking match day as finished.`,
					);
					await closeMatchDay(message, users, matches, matchDay, embeds);
				}
				return;
			}
			if (newDescriptions.some((d, i) => d !== embeds[i].data.description)) {
				embeds[0].setDescription(newDescriptions[0]);
				embeds[1].setDescription(newDescriptions[1]).setTimestamp();
				embeds[1].setFields({
					name: "Classifica Generale",
					value: createFinalLeaderboard(leaderboard),
				});
				message.edit({ embeds }).catch(CustomClient.printToStderr);
			}
			CustomClient.printToStdout(
				`[${new Date().toISOString()}] Matches data updated.`,
			);
		}
	});
};

export const liveScore = async (client: CustomClient) => {
	try {
		const [users, matchDay, channel] = await Promise.all([
			User.find({
				$or: [
					{ predictions: { $exists: true, $type: "array", $ne: [] } },
					{ dayPoints: { $exists: true, $ne: null } },
				],
			}),
			MatchDay.findOne({}).sort("-day"),
			client.channels.fetch(env.PREDICTIONS_CHANNEL!),
		]);

		if (!matchDay) {
			CustomClient.printToStderr("No match day found!");
			return;
		}
		if (
			matchDay.finished! ||
			!users.length ||
			!users.find((u) => u.predictions?.length)
		)
			return;
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (!channel?.isTextBased() || channel.isDMBased()) {
			CustomClient.printToStderr("Invalid predictions channel!");
			return;
		}
		const matches = await loadMatches(matchDay._id);

		if (!matches.success) {
			CustomClient.printToStderr(matches.message);
			CustomClient.printToStderr(matches.errors);
			return;
		}
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
			matchDay.save().catch(CustomClient.printToStderr);
		} else if (
			embeds.some(
				(d, i) => d.data.description !== message.embeds[i]?.description,
			) ||
			embeds[1].data.fields?.[0].value !== message.embeds[1]?.fields[0].value
		)
			message.edit({ embeds }).catch(CustomClient.printToStderr);
		if (matches.data.every((match) => match.match_status !== 1)) {
			const next = matches.data.find((match) => match.match_status === 0);

			if (next) {
				const delay = new Date(next.date_time).getTime() - Date.now();

				CustomClient.printToStdout(
					`[${new Date().toISOString()}] No match live. Waiting for the next match in ${ms(
						delay,
					)}.`,
				);
				await setPromiseTimeout(delay);
			} else {
				await closeMatchDay(message, users, matches, matchDay, embeds);
				return;
			}
		}
		startWebSocket(matches, users, embeds, message, matchDay);
	} catch (err) {
		CustomClient.printToStderr(err);
	}
};

export default liveScore;
