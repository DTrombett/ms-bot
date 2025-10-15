/**
 * Calculate the average points per match day for each user
 */
export const calculateAveragePoints = (
	users: Pick<User, "id" | "matchPointsHistory">[],
): Record<string, number> => {
	const averages: Record<string, number> = {};

	for (const user of users) {
		const matchPointsHistory = user.matchPointsHistory?.split(",");

		if (!matchPointsHistory?.length) continue;
		const validPoints = matchPointsHistory
			.filter((point) => point.trim())
			.map(Number);
		if (!validPoints.length) continue;
		averages[user.id] =
			validPoints.reduce((sum, points) => sum + points, 0) / validPoints.length;
	}
	return averages;
};
