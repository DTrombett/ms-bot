/**
 * Get a random number between a min and max.
 * @param min - The minimum number
 * @param max - The maximum number
 * @returns A random number between min and max
 */
export const randomNumber: {
	(min: number, max: number): number;
	(): number;
} = (min?: number, max?: number) =>
	min === undefined ? Math.random() : Math.floor(Math.random() * (max! - min + 1)) + min;

export default randomNumber;
