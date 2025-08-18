import {
	Leaderboard,
	MatchesData,
	MatchStatus,
	calculateAveragePoints,
	calculateWins,
	type ResolvedUser,
} from ".";

export const resolveLeaderboard = (
	users: ResolvedUser[],
	matches: Extract<MatchesData, { success: true }>["data"],
) => {
	// Pre-calculate wins and averages once for efficiency
	const wins = calculateWins(users);
	const averages = calculateAveragePoints(users);

	const leaderboard = users
		.map<Leaderboard[number]>((user) => {
			let maxPoints = 0;

			return [
				user,
				matches.reduce((points, match) => {
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
					const toBePlayed =
						match.match_status === MatchStatus.ToBePlayed ||
						match.match_status === MatchStatus.Postponed;
					const isStarred = match.match_id === user.match;

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
					if (isStarred) diffPoints *= 2;
					if (match.match_status === MatchStatus.Finished)
						maxPoints += diffPoints;
					else if (home != null)
						if (
							toBePlayed ||
							(match.home_goal <= Number(home) &&
								match.away_goal <= Number(away))
						)
							maxPoints += isStarred ? 6 : 3;
						else maxPoints += isStarred ? 4 : 2;
					else if (type.length === 1) maxPoints += isStarred ? 4 : 2;
					else maxPoints += isStarred ? 2 : 1;
					return toBePlayed ? points : points + diffPoints;
				}, 0),
				0,
				maxPoints,
			] as const;
		})
		.sort((a, b) => {
			// Primary: sort by match points for this day
			if (a[1] !== b[1]) return b[1] - a[1];

			// Secondary: sort by historical wins
			const aWins = wins[a[0].id] ?? 0;
			const bWins = wins[b[0].id] ?? 0;
			if (aWins !== bWins) return bWins - aWins;

			// Tertiary: sort by historical average points
			const aAvg = averages[a[0].id] ?? 0;
			const bAvg = averages[b[0].id] ?? 0;
			return bAvg - aAvg;
		});
	const first = Math.ceil(leaderboard.length / 2);

	for (const entry of leaderboard)
		entry[2] =
			first -
			(entry[0].predictions.length
				? leaderboard.findIndex(([, p]) => entry[1] === p)
				: leaderboard.length) +
			1;
	return leaderboard;
};
