/**
 * Get a random number between a min and max.
 * @param min - The minimum number
 * @param max - The maximum number
 * @returns A random number between min and max
 */
export const randomNumber = (min = 0, max = 1) =>
	Math.floor(Math.random() * (max - min + 1)) + min;

export default randomNumber;
