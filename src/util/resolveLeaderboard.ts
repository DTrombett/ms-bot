import { Leaderboard, Prediction, User, type MatchData } from ".";

const multipliers: Record<string, number | undefined> = {
	GROUP_STANDINGS: 1,
	ROUND_OF_16: 1,
	QUARTER_FINALS: 1.5,
	SEMIFINAL: 2,
	FINAL: 3,
};

export const resolveLeaderboard = (
	users: (User & { predictions: Prediction[] })[],
	matches: MatchData[],
) => {
	const leaderboard = users
		.map<Leaderboard[number]>((user) => {
			let maxPoints = 0;

			return [
				user,
				matches.reduce((points, match) => {
					const matched = user.predictions
						.find((p) => match.id === p.matchId)
						?.prediction.match(
							/(?<type>(X|1|2){1,2})( \((?<home>(?<=\()\d+) - (?<away>\d+(?=\))))?/,
						)?.groups;

					if (!matched) {
						maxPoints--;
						return points - 1;
					}
					match.score ??= {
						total: { away: 0, home: 0 },
						regular: { away: 0, home: 0 },
					};
					const { type, home, away } = matched as {
						type: "1" | "1X" | "2" | "12" | "X" | "X2";
						home?: `${number}`;
						away?: `${number}`;
					};
					const result =
						match.score.total.home > match.score.total.away
							? "1"
							: match.score.total.home < match.score.total.away
								? "2"
								: "X";
					let diffPoints = 0;
					const toBePlayed = match.status === "UPCOMING";

					if (!toBePlayed)
						if (type === result)
							if (
								home != null &&
								Number(home) === match.score.total.home &&
								Number(away) === match.score.total.away
							)
								diffPoints = 3;
							else diffPoints = 2;
						else if (type.includes(result)) diffPoints = 1;
						else if (type.length === 2) diffPoints = -1;
					if (match.status === "FINISHED") maxPoints += diffPoints;
					else if (home != null)
						if (
							toBePlayed ||
							(match.score.total.home <= Number(home) &&
								match.score.total.away <= Number(away))
						)
							maxPoints += 3;
						else maxPoints += 2;
					else if (type.length === 1) maxPoints += 2;
					else maxPoints++;
					return toBePlayed ? points : points + diffPoints;
				}, 0),
				0,
				maxPoints,
			] as const;
		})
		.sort((a, b) => b[1] - a[1]);
	const first = Math.ceil(leaderboard.length / 2);

	for (const entry of leaderboard)
		entry[2] =
			(first -
				(entry[0].predictions.length
					? leaderboard.findIndex(([, p]) => entry[1] === p)
					: leaderboard.length)) *
			(multipliers[matches[0]?.round.metaData.type ?? ""] ?? 1);
	return leaderboard;
};
