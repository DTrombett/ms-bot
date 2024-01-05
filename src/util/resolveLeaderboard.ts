import { Leaderboard, MatchesData, Prediction, User } from ".";

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
		entry[2] =
			first -
			(entry[0].predictions.length
				? leaderboard.findIndex(([, p]) => entry[1] === p)
				: leaderboard.length - 1);
	return leaderboard;
};
