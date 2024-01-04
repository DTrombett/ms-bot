import { EmbedBuilder } from "@discordjs/builders";
import {
	Leaderboard,
	normalizeTeamName,
	type MatchesData,
	type Prediction,
	type User,
} from ".";

const finalEmojis: Record<number, string | undefined> = {
	[-2]: "⏬",
	[-1]: "⬇️",
	0: "➖",
	1: "⬆️",
	2: "⏫",
};

export const resolveLeaderboard = (
	users: (User & { predictions: Prediction[] })[],
	matches: Extract<MatchesData, { success: true }>,
) => {
	const leaderboard = users
		.map((user): Leaderboard[number] => {
			let maxPoints = 0;

			return [
				user,
				matches.data.reduce((points, match) => {
					const matched = user.predictions
						.find((p) => match.match_id === p.matchId)
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
	const first = Math.ceil(leaderboard.length / 2);

	for (const entry of leaderboard)
		entry[2] = first - leaderboard.findIndex(([, p]) => entry[1] === p);
	return leaderboard;
};
const createLeaderboardDescription = (
	leaderboard: Leaderboard,
	final = false,
) => {
	const highestMatchPoints = leaderboard.reduce(
		(highest, [{ matchPointsHistory }]) =>
			matchPointsHistory
				?.split(",")
				.reduce((h, p) => Math.max(Number(p), h), highest) ?? highest,
		-Infinity,
	);

	return leaderboard
		.toSorted((a, b) => b[1] - a[1])
		.map(([user, points, dayPoints, maxPoints]) => {
			const position = leaderboard.findIndex(([, p]) => points === p) + 1;
			const matchPointsHistory =
				user.matchPointsHistory
					?.split(",")
					.filter((n) => n)
					.map((n) => Number(n)) ?? [];

			return `${position}\\. <@${user.id}>: **${points}** Punt${
				points === 1 ? "o" : "i"
			} Partita ${
				final
					? `(avg. ${(
							(matchPointsHistory.reduce((a, b) => a + b, 0) + points) /
							(matchPointsHistory.length + 1)
						).toFixed(2)})`
					: `(max. ${maxPoints}) (${dayPoints > 0 ? "+" : ""}${dayPoints})`
			}${
				position === 1 && points > highestMatchPoints
					? " ✨"
					: !matchPointsHistory.some((p) => p >= points)
						? " 🔥"
						: ""
			}`;
		})
		.join("\n");
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
const createFinalLeaderboard = (leaderboard: Leaderboard) => {
	const oldLeaderboard = leaderboard.toSorted(
		(a, b) => (b[0].dayPoints ?? 0) - (a[0].dayPoints ?? 0),
	);

	return leaderboard
		.toSorted(
			(a, b) => (b[0].dayPoints ?? 0) + b[2] - ((a[0].dayPoints ?? 0) + a[2]),
		)
		.map(([user, , points], _i, array) => {
			const newPoints = (user.dayPoints ?? 0) + points;
			const newPosition = array.findIndex(
				([u, , p]) => (u.dayPoints ?? 0) + p === newPoints,
			);
			const diff =
				oldLeaderboard.findIndex(([u]) => u.dayPoints === user.dayPoints) -
				newPosition;

			return `${newPosition + 1}\\. <@${user.id}>: **${newPoints}** Punt${
				Math.abs(newPoints) === 1 ? "o" : "i"
			} Giornata ${finalEmojis[diff] ?? finalEmojis[diff > 0 ? 2 : -2]}`;
		})
		.join("\n");
};
const resolveStats = (users: User[]) => {
	let currentStreaks: { id: string; days: number }[] = [];
	let totalPoints = 0;
	const highestAvg: { users: string[]; avg: number } = {
		users: [],
		avg: -Infinity,
	};
	const highestDiff: { users: string[]; points: number } = {
		users: [],
		points: 0,
	};
	const highestPoints: { users: string[]; points: number } = {
		users: [],
		points: -Infinity,
	};
	const highestStreak: { users: string[]; days: number } = {
		users: [],
		days: -Infinity,
	};
	const days: {
		winners: string[];
		totalPoints: number;
		winnerPoints: number;
		day: number;
		secondPoints: number;
	}[] = [];

	for (const user of users) {
		const total: [number, number] = [0, 0];
		const matchPointsHistory = user.matchPointsHistory?.split(",");

		for (let i = 0; i < (matchPointsHistory?.length ?? 0); i++)
			if (matchPointsHistory?.[i]) {
				const n = Number(matchPointsHistory[i]);

				total[1]++;
				total[0] += n;
				if (days[i]) {
					days[i]!.totalPoints += n;
					if (n > days[i]!.winnerPoints) {
						days[i]!.secondPoints = days[i]!.winnerPoints;
						days[i]!.winners = [user.id];
						days[i]!.winnerPoints = n;
					} else if (n === days[i]!.winnerPoints) {
						days[i]!.secondPoints = days[i]!.winnerPoints;
						days[i]!.winners.push(user.id);
					} else if (n > days[i]!.secondPoints) days[i]!.secondPoints = n;
				} else
					days[i] = {
						day: i,
						totalPoints: n,
						winners: [user.id],
						winnerPoints: n,
						secondPoints: -Infinity,
					};
			}
		const avg = total[0] / total[1];

		if (avg >= highestAvg.avg) {
			highestAvg.users = [
				user.id,
				...(avg === highestAvg.avg ? highestAvg.users : []),
			];
			highestAvg.avg = avg;
		}
		totalPoints += total[0];
	}
	let [bestDay] = days;

	for (const day of days) {
		if (day.totalPoints > bestDay!.totalPoints) bestDay = day;
		if (day.winnerPoints >= highestPoints.points) {
			highestPoints.users = day.winners.concat(
				day.winnerPoints === highestPoints.points ? highestPoints.users : [],
			);
			highestPoints.points = day.winnerPoints;
		}
		currentStreaks = currentStreaks.filter(({ id }) =>
			day.winners.includes(id),
		);
		const diff = day.winnerPoints - day.secondPoints;
		let updateDiff = false;

		if (diff > highestDiff.points) {
			highestDiff.points = diff;
			highestDiff.users = day.winners;
		} else if (diff === highestDiff.points) updateDiff = true;
		for (const winner of day.winners) {
			let found = currentStreaks.find(({ id }) => winner === id);

			if (updateDiff && !highestDiff.users.includes(winner))
				highestDiff.users.push(winner);
			if (found) found.days++;
			else currentStreaks.push((found = { id: winner, days: 1 }));
			if (found.days >= highestStreak.days) {
				highestStreak.users = [
					found.id,
					...(found.days === highestStreak.days ? highestStreak.users : []),
				];
				highestStreak.days = found.days;
			}
		}
	}
	return {
		name: "Statistiche Serie A 2023/2024",
		value: `- Punteggio più alto: ${
			highestPoints.users.length
				? `${highestPoints.users.map((id) => `<@${id}>`).join(", ")} • **${
						highestPoints.points
					}** Punti Partita`
				: "**N/A**"
		}\n- Media più alta: ${
			highestAvg.users.length
				? `${highestAvg.users
						.map((id) => `<@${id}>`)
						.join(", ")} • **${highestAvg.avg.toFixed(2)}** Punti Partita`
				: "**N/A**"
		}\n- Vittoria con maggior distacco: ${
			highestDiff.users.length
				? `${highestDiff.users.map((id) => `<@${id}>`).join(", ")} • **${
						highestDiff.points
					}** Punti Partita`
				: "**N/A**"
		}\n- Combo vittorie più lunga: ${
			highestStreak.users.length
				? `${highestStreak.users.map((id) => `<@${id}>`).join(", ")} • **${
						highestStreak.days
					}** Giornate`
				: "**N/A**"
		}\n- Giornata con più punti: ${
			bestDay
				? `**${bestDay.day + 1}ª** Giornata • **${
						bestDay.totalPoints
					}** Punti Partita`
				: "**N/A**"
		}\n- Punti totali accumulati: ${
			days.length
				? `**${totalPoints}** Punti Partita • Avg. **${(
						totalPoints / days.length
					).toFixed(2)}**/day`
				: "**N/A**"
		}`,
	};
};

export const getLiveEmbed = (
	users: (User & {
		predictions: Prediction[];
	})[],
	matches: Extract<MatchesData, { success: true }>,
	leaderboard: Leaderboard,
	day: number,
	finished = false,
) => [
	new EmbedBuilder()
		.setThumbnail(
			"https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
		)
		.setTitle(
			finished
				? `Risultati Finali ${day}ª Giornata`
				: `🔴 Risultati Live ${day}ª Giornata`,
		)
		.setDescription(resolveMatches(matches))
		.setAuthor({
			name: "Serie A TIM",
			url: "https://legaseriea.it/it/serie-a",
		})
		.setColor(0xed4245)
		.toJSON(),
	new EmbedBuilder()
		.setThumbnail(
			"https://img.legaseriea.it/vimages/64df31f4/Logo-SerieA_TIM_RGB.jpg",
		)
		.setTitle(
			finished
				? `⚽ Classifica Definitiva Pronostici ${day}ª Giornata`
				: `🔴 Classifica Live Pronostici ${day}ª Giornata`,
		)
		.setDescription(createLeaderboardDescription(leaderboard))
		.setFooter({ text: "Ultimo aggiornamento" })
		.addFields(
			{
				name: "Classifica Generale Provvisoria",
				value: createFinalLeaderboard(leaderboard),
			},
			resolveStats(users),
		)
		.setAuthor({
			name: "Serie A TIM",
			url: "https://legaseriea.it/it/serie-a",
		})
		.setColor(0x3498db)
		.setTimestamp()
		.toJSON(),
];
