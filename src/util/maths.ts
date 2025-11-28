export const percentile = (
	values: number[],
	p: number,
	int = false,
): number => {
	const rank = p * (values.length - 1);
	const lower = Math.floor(rank);

	return (
		values[lower]! +
		Math.abs(values[Math.ceil(rank)]! - values[lower]!) *
			(int ? Math.round(rank - lower) : rank - lower)
	);
};
