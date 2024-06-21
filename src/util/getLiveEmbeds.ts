import { EmbedBuilder } from "@discordjs/builders";
import { Leaderboard, type MatchData, type Prediction, type User } from ".";

const finalEmojis: Record<number, string | undefined> = {
	[-2]: "⏬",
	[-1]: "⬇️",
	0: "➖",
	1: "⬆️",
	2: "⏫",
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
const resolveMatches = (matches: MatchData[]) =>
	matches
		.map(
			(match) =>
				`- ${match.status === "LIVE" ? "🔴 " : ""}[${match.homeTeam.internationalName} - ${match.awayTeam.internationalName}](https://uefa.com/euro2024/match/${match.id}): ${
					match.status === "UPCOMING"
						? `<t:${Math.round(Date.parse(match.kickOffTime.dateTime) / 1_000)}:F>`
						: // TODO: Check this status
							match.status === ""
							? "*Posticipata*"
							: `**${match.score?.total.home ?? 0} - ${match.score?.total.away ?? 0}**`
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
		if (!(day as object | null)) continue;
		if (!bestDay || day.totalPoints > bestDay.totalPoints) bestDay = day;
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
		name: "Statistiche UEFA EURO 2024",
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
		}\n- Giornata con più punti: ${
			bestDay
				? `**${bestDay.day + 1}ª** Giornata • **${
						bestDay.totalPoints
					}** Punti Partita`
				: "**N/A**"
		}\n- Punti totali accumulati: ${
			days.length ? `**${totalPoints}** Punti Partita` : "**N/A**"
		}`,
	};
};

export const getLiveEmbeds = (
	users: (User & {
		predictions: Prediction[];
	})[],
	matches: MatchData[],
	leaderboard: Leaderboard,
	title: string,
	finished = false,
) => [
	new EmbedBuilder()
		.setThumbnail(
			"https://upload.wikimedia.org/wikipedia/it/f/f0/UEFA_Euro_2024_Logo.png",
		)
		.setTitle(
			finished ? `Risultati finali ${title}` : `🔴 Risultati Live ${title}`,
		)
		.setDescription(resolveMatches(matches))
		.setAuthor({
			name: "UEFA EURO 2024",
			url: "https://uefa.com/euro2024",
		})
		.setColor(0x004f9f)
		.toJSON(),
	new EmbedBuilder()
		.setThumbnail(
			"https://upload.wikimedia.org/wikipedia/it/f/f0/UEFA_Euro_2024_Logo.png",
		)
		.setTitle(
			finished
				? `⚽ Classifica Definitiva Pronostici ${title}`
				: `🔴 Classifica Live Pronostici ${title}`,
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
			resolveStats(users),
		)
		.setAuthor({
			name: "UEFA EURO 2024",
			url: "https://uefa.com/euro2024",
		})
		.setColor(0x3498db)
		.setTimestamp()
		.toJSON(),
];
