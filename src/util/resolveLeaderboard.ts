import { MatchStatus } from "./Constants";

export const resolveLeaderboard = (users: ResolvedUser[], matches: Match[]) => {
	const leaderboard = users
		.map<Leaderboard[number]>((user) => {
			let maxPoints = 0;

			return [
				user,
				matches.reduce((points, match) => {
					const matched = user.predictions
						.find((p) => match.matchId === p.matchId)
						?.prediction.match(
							/(?<type>(X|1|2){1,2})( \((?<home>(?<=\()\d+) - (?<away>\d+(?=\))))?/,
						)?.groups;

					if (!matched) {
						maxPoints--;
						return points - 1;
					}
					match.providerHomeScore ??= 0;
					match.providerAwayScore ??= 0;
					const { type, home, away } = matched as {
						type: "1" | "1X" | "2" | "12" | "X" | "X2";
						home?: `${number}`;
						away?: `${number}`;
					};
					const result =
						match.providerHomeScore > match.providerAwayScore ? "1"
						: match.providerHomeScore < match.providerAwayScore ? "2"
						: "X";
					let diffPoints = 0;
					const toBePlayed =
						match.providerStatus === MatchStatus.ToBePlayed ||
						match.providerStatus === MatchStatus.Postponed;
					const isStarred = match.matchId === user.match;

					if (!toBePlayed)
						if (type === result)
							if (
								home != null &&
								Number(home) === match.providerHomeScore &&
								Number(away) === match.providerAwayScore
							)
								diffPoints = 3;
							else diffPoints = 2;
						else if (type.includes(result)) diffPoints = 1;
						else if (type.length === 2) diffPoints = -1;
					if (isStarred) diffPoints *= 2;
					if (match.providerStatus === MatchStatus.Finished)
						maxPoints += diffPoints;
					else if (home != null)
						if (
							toBePlayed ||
							(match.providerHomeScore <= Number(home) &&
								match.providerAwayScore <= Number(away))
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
		.sort((a, b) => b[1] - a[1]);
	const first = Math.ceil(leaderboard.length / 2);

	for (const entry of leaderboard)
		entry[2] =
			first -
			(entry[0].predictions.length ?
				leaderboard.findIndex(([, p]) => entry[1] === p)
			:	leaderboard.length);
	return leaderboard;
};
