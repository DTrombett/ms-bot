export const find = <T>(
	sortedArray: T[],
	target: T,
	compareFn: (a: T, b: T) => number,
) => {
	let low = 0;
	let high = sortedArray.length - 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const compare = compareFn(sortedArray[mid]!, target);

		if (compare === 0) return sortedArray[mid];
		else if (compare < 0) low = mid + 1;
		else high = mid - 1;
	}
	return undefined;
};
