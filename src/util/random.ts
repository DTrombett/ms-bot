/**
 * Get a random number between a min and max.
 * @param min - The minimum number
 * @param max - The maximum number
 * @returns A random number between min and max
 */
export const randomNumber = (min?: number, max?: number) =>
	min === undefined || max === undefined
		? Math.random()
		: Math.floor(Math.random() * (max - min + 1)) + min;

export const randomArrayItem = <T>(array: T[]): T =>
	array[Math.floor(Math.random() * array.length)]!;
