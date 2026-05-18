export const randomArrayItem = <T>(array: T[] | readonly T[]): T =>
	array[Math.floor(Math.random() * array.length)]!;

export const shuffleArray = <T extends unknown[]>(array: T): T => {
	let currentIndex = array.length;

	if (currentIndex <= 1) return array;
	while (currentIndex != 0) {
		const randomIndex = Math.floor(Math.random() * currentIndex--);

		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex]!,
			array[currentIndex]!,
		];
	}
	return array;
};
