import type { User } from "./index.ts";
import { calculateAveragePoints } from "./calculateAveragePoints.ts";
import { calculateWins } from "./calculateWins.ts";

/**
 * Enhanced sorting function for leaderboards that considers:
 * 1. Total points (dayPoints) - descending
 * 2. Number of wins - descending
 * 3. Average points - descending
 */
export const sortLeaderboard = <
	T extends Pick<User, "dayPoints" | "id" | "matchPointsHistory">,
>(
	users: T[],
): T[] => {
	const wins = calculateWins(users);
	const averages = calculateAveragePoints(users);

	return users.sort((a, b) => {
		const aPoints = a.dayPoints ?? 0;
		const bPoints = b.dayPoints ?? 0;

		// Primary: sort by total points
		if (aPoints !== bPoints) return bPoints - aPoints;

		// Secondary: sort by wins
		const aWins = wins[a.id] ?? 0;
		const bWins = wins[b.id] ?? 0;
		if (aWins !== bWins) return bWins - aWins;

		// Tertiary: sort by average points
		const aAvg = averages[a.id] ?? 0;
		const bAvg = averages[b.id] ?? 0;
		return bAvg - aAvg;
	});
};
