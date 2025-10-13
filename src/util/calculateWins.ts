import type { User } from "./types.ts";

/**
 * Calculate the number of wins (days where user was top scorer) for each user
 */
export const calculateWins = (
	users: Pick<User, "id" | "matchPointsHistory">[],
): Record<string, number> => {
	const wins: Record<string, number> = {};
	const days: {
		winners: Set<string>;
		winnerPoints: number;
		day: number;
	}[] = [];

	for (const user of users) {
		const matchPointsHistory = user.matchPointsHistory?.split(",");

		wins[user.id] = 0;
		for (let i = 0; i < (matchPointsHistory?.length ?? 0); i++)
			if (matchPointsHistory?.[i]) {
				const points = Number(matchPointsHistory[i]);

				if (days[i]) {
					// Day already exists, check if this user has higher points
					if (points > days[i]!.winnerPoints) {
						// New winner for this day
						days[i]!.winners = new Set([user.id]);
						days[i]!.winnerPoints = points;
					} else if (points === days[i]!.winnerPoints)
						// Tie for this day
						days[i]!.winners.add(user.id);
				} else
					// First user for this day
					days[i] = {
						day: i,
						winners: new Set([user.id]),
						winnerPoints: points,
					};
			}
	}
	for (const day of days) for (const winnerId of day.winners) wins[winnerId]!++;
	return wins;
};
