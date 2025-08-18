import type { User } from ".";

/**
 * Calculate the average points per match day for each user
 */
export const calculateAveragePoints = (
	users: Pick<User, "id" | "matchPointsHistory">[],
): Record<string, number> => {
	const averages: Record<string, number> = {};

	for (const user of users) {
		const matchPointsHistory = user.matchPointsHistory?.split(",");

		if (!matchPointsHistory?.length) {
			averages[user.id] = 0;
			continue;
		}

		// Filter out empty strings and calculate average of actual match points
		const validPoints = matchPointsHistory
			.filter((point) => point.trim() !== "")
			.map(Number);

		if (validPoints.length === 0) averages[user.id] = 0;
		else {
			const total = validPoints.reduce((sum, points) => sum + points, 0);
			averages[user.id] = total / validPoints.length;
		}
	}

	return averages;
};
