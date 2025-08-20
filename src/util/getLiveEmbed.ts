import { EmbedBuilder } from "@discordjs/builders";
import {
	Leaderboard,
	MatchStatus,
	calculateAveragePoints,
	calculateWins,
	normalizeTeamName,
	type MatchesData,
	type ResolvedUser,
	type User,
} from ".";

const finalEmojis: Record<number, string | undefined> = {
	[-2]: "⏬",
	[-1]: "⬇️",
	0: "➖",
	1: "⬆️",
	2: "⏫",
};

export const createLeaderboardDescription = (
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
			const position = user.predictions.length
				? leaderboard.findIndex(([, p]) => points === p) + 1
				: leaderboard.length;
			const matchPointsHistory =
				user.matchPointsHistory
					?.split(",")
					.filter((n) => n)
					.map((n) => Number(n)) ?? [];

			return `${position}\\. <@${user.id}>: **${points}** Punt${
				points === 1 ? "o" : "i"
			} Partita (${
				final
					? `avg. ${(
							(matchPointsHistory.reduce((a, b) => a + b, 0) + points) /
							(matchPointsHistory.length + 1)
						).toFixed(2)}`
					: `max. ${maxPoints}`
			}) (${dayPoints > 0 ? "+" : ""}${dayPoints})${
				position === 1 && points > highestMatchPoints
					? " ✨"
					: !matchPointsHistory.some((p) => p >= points)
						? " 🔥"
						: ""
			}`;
		})
		.join("\n");
};
const resolveMatches = (
	matches: Extract<MatchesData, { success: true }>["data"],
) =>
	matches
		.map(
			(match) =>
				`- ${match.match_status === MatchStatus.Live ? "🔴 " : ""}[${normalizeTeamName(
					match.home_team_name,
				)} - ${normalizeTeamName(match.away_team_name)}](https://legaseriea.it${
					match.slug
				}): ${
					match.match_status === MatchStatus.ToBePlayed
						? `<t:${Math.round(new Date(match.date_time).getTime() / 1_000)}:F>`
						: match.match_status === MatchStatus.Postponed
							? "*Posticipata*"
							: `**${match.home_goal ?? 0} - ${match.away_goal ?? 0}**`
				}`,
		)
		.join("\n");
export const createFinalLeaderboard = (leaderboard: Leaderboard) => {
	const oldLeaderboard = leaderboard.toSorted(
		(a, b) => (b[0].dayPoints ?? 0) - (a[0].dayPoints ?? 0),
	);
	const users = leaderboard.map(([user]) => user);
	const wins = calculateWins(users);
	const averages = calculateAveragePoints(users);
	// Find current day winners (users with highest matchPoints)
	const maxMatchPoints = Math.max(
		...leaderboard.map(([, matchPoints]) => matchPoints),
	);
	const currentDayWinners = leaderboard
		.filter(([, matchPoints]) => matchPoints === maxMatchPoints)
		.map(([user]) => user.id);

	for (const winnerId of currentDayWinners)
		wins[winnerId] = (wins[winnerId] ?? 0) + 1;
	return leaderboard
		.toSorted((a, b) => {
			const aTotalPoints = (a[0].dayPoints ?? 0) + a[2];
			const bTotalPoints = (b[0].dayPoints ?? 0) + b[2];

			// Primary: sort by total points (including current match day)
			if (aTotalPoints !== bTotalPoints) return bTotalPoints - aTotalPoints;

			// Secondary: sort by wins (including current day)
			const aWins = wins[a[0].id] ?? 0;
			const bWins = wins[b[0].id] ?? 0;
			if (aWins !== bWins) return bWins - aWins;

			// Tertiary: sort by average points (historical)
			const aAvg = averages[a[0].id] ?? 0;
			const bAvg = averages[b[0].id] ?? 0;
			return bAvg - aAvg;
		})
		.map(([user, , points], i) => {
			const newPoints = (user.dayPoints ?? 0) + points;
			const diff = oldLeaderboard.findIndex(([u]) => u.id === user.id) - i;

			return `${i + 1}. <@${user.id}>: **${newPoints}** Punt${
				Math.abs(newPoints) === 1 ? "o" : "i"
			} Giornata ${finalEmojis[diff] ?? finalEmojis[diff > 0 ? 2 : -2]}`;
		})
		.join("\n");
};
export const resolveStats = (
	users: User[],
	leaderboard?: Leaderboard,
	finished = false,
) => {
	let currentStreaks: { id: string; days: number }[] = [];
	let totalPoints = 0;
	const highestAvg: { users: Set<string>; avg: number } = {
		users: new Set(),
		avg: -Infinity,
	};
	const highestDiff: { users: Set<string>; points: number } = {
		users: new Set(),
		points: 0,
	};
	const highestPoints: { users: Set<string>; points: number } = {
		users: new Set(),
		points: -Infinity,
	};
	const highestStreak: { users: Set<string>; days: number } = {
		users: new Set(),
		days: -Infinity,
	};
	const days: {
		winners: Set<string>;
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
						days[i]!.winners = new Set([user.id]);
						days[i]!.winnerPoints = n;
					} else if (n === days[i]!.winnerPoints) {
						days[i]!.secondPoints = days[i]!.winnerPoints;
						days[i]!.winners.add(user.id);
					} else if (n > days[i]!.secondPoints) days[i]!.secondPoints = n;
				} else
					days[i] = {
						day: i,
						totalPoints: n,
						winners: new Set([user.id]),
						winnerPoints: n,
						secondPoints: -Infinity,
					};
			}

		// If this is the final day and we have leaderboard data, include current day points
		if (finished && leaderboard) {
			const currentDayEntry = leaderboard.find(([u]) => u.id === user.id);
			if (currentDayEntry) {
				const [, matchPoints] = currentDayEntry;
				const currentDayIndex = matchPointsHistory?.length ?? 0;

				total[1]++;
				total[0] += matchPoints;

				if (days[currentDayIndex]) {
					days[currentDayIndex].totalPoints += matchPoints;
					if (matchPoints > days[currentDayIndex].winnerPoints) {
						days[currentDayIndex].secondPoints =
							days[currentDayIndex].winnerPoints;
						days[currentDayIndex].winners = new Set([user.id]);
						days[currentDayIndex].winnerPoints = matchPoints;
					} else if (matchPoints === days[currentDayIndex].winnerPoints) {
						days[currentDayIndex].secondPoints =
							days[currentDayIndex].winnerPoints;
						days[currentDayIndex].winners.add(user.id);
					} else if (matchPoints > days[currentDayIndex].secondPoints)
						days[currentDayIndex].secondPoints = matchPoints;
				} else
					days[currentDayIndex] = {
						day: currentDayIndex,
						totalPoints: matchPoints,
						winners: new Set([user.id]),
						winnerPoints: matchPoints,
						secondPoints: -Infinity,
					};
			}
		}

		const avg = total[0] / total[1];

		if (avg >= highestAvg.avg) {
			highestAvg.users = new Set([
				user.id,
				...(avg === highestAvg.avg ? highestAvg.users : []),
			]);
			highestAvg.avg = avg;
		}
		totalPoints += total[0];
	}
	let [bestDay] = days;

	for (const day of days) {
		if (day.totalPoints > bestDay!.totalPoints) bestDay = day;
		if (day.winnerPoints >= highestPoints.points) {
			highestPoints.users = new Set([
				...day.winners,
				...(day.winnerPoints === highestPoints.points
					? highestPoints.users
					: []),
			]);
			highestPoints.points = day.winnerPoints;
		}
		currentStreaks = currentStreaks.filter(({ id }) => day.winners.has(id));
		const diff = day.winnerPoints - day.secondPoints;
		let updateDiff = false;

		if (diff > highestDiff.points) {
			highestDiff.points = diff;
			highestDiff.users = day.winners;
		} else if (diff === highestDiff.points) updateDiff = true;
		for (const winner of day.winners) {
			let found = currentStreaks.find(({ id }) => winner === id);

			if (updateDiff && !highestDiff.users.has(winner))
				highestDiff.users.add(winner);
			if (found) found.days++;
			else currentStreaks.push((found = { id: winner, days: 1 }));
			if (found.days >= highestStreak.days) {
				highestStreak.users = new Set([
					found.id,
					...(found.days === highestStreak.days ? highestStreak.users : []),
				]);
				highestStreak.days = found.days;
			}
		}
	}
	return {
		name: "Statistiche Serie A 2025/2026",
		value: `- Punteggio più alto: ${
			highestPoints.users.size
				? `${[...highestPoints.users].map((id) => `<@${id}>`).join(", ")} • **${
						highestPoints.points
					}** Punti Partita`
				: "**N/A**"
		}\n- Media più alta: ${
			highestAvg.users.size
				? `${[...highestAvg.users]
						.map((id) => `<@${id}>`)
						.join(", ")} • **${highestAvg.avg.toFixed(2)}** Punti Partita`
				: "**N/A**"
		}\n- Vittoria con maggior distacco: ${
			highestDiff.users.size
				? `${[...highestDiff.users].map((id) => `<@${id}>`).join(", ")} • **${
						highestDiff.points
					}** Punti Partita`
				: "**N/A**"
		}\n- Combo vittorie più lunga: ${
			highestStreak.users.size
				? `${[...highestStreak.users].map((id) => `<@${id}>`).join(", ")} • **${
						highestStreak.days
					}** Giornate`
				: "**N/A**"
		}\n- Maggior numero di punti in una giornata: ${
			bestDay ? `**${bestDay.totalPoints}** Punti Partita` : "**N/A**"
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
	users: ResolvedUser[],
	matches: Extract<MatchesData, { success: true }>["data"],
	leaderboard: Leaderboard,
	day: number,
	finished = false,
) => [
	new EmbedBuilder()
		.setThumbnail(
			"https://img.legaseriea.it/vimages/6685b340/SerieA_ENILIVE_RGB.jpg",
		)
		.setTitle(
			finished
				? `Risultati Finali ${day}ª Giornata`
				: `🔴 Risultati Live ${day}ª Giornata`,
		)
		.setDescription(resolveMatches(matches))
		.setAuthor({
			name: "Serie A Enilive",
			url: "https://legaseriea.it/it/serie-a",
		})
		.setColor(0xed4245)
		.toJSON(),
	new EmbedBuilder()
		.setThumbnail(
			"https://img.legaseriea.it/vimages/6685b340/SerieA_ENILIVE_RGB.jpg",
		)
		.setTitle(
			finished
				? `⚽ Classifica Definitiva Pronostici ${day}ª Giornata`
				: `🔴 Classifica Live Pronostici ${day}ª Giornata`,
		)
		.setDescription(createLeaderboardDescription(leaderboard, finished))
		.setFooter({ text: "Ultimo aggiornamento" })
		.addFields(
			{
				name: finished
					? "Classifica Generale"
					: "Classifica Generale Provvisoria",
				value: createFinalLeaderboard(leaderboard),
			},
			resolveStats(users, leaderboard, finished),
		)
		.setAuthor({
			name: "Serie A Enilive",
			url: "https://legaseriea.it/it/serie-a",
		})
		.setColor(0x3498db)
		.setTimestamp()
		.toJSON(),
];
