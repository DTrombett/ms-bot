import { memoryUsage } from "node:process";

const digits = 2;

/**
 * Calculate the RAM usage and return a string with the value.
 */
export const calculateRam = () => {
	const memory = memoryUsage();

	return `RSS: ${(memory.rss / 1024 / 1024).toFixed(digits)}MB\nUsed: ${(
		memory.heapUsed /
		1024 /
		1024
	).toFixed(digits)}MB\nTotal: ${(memory.heapTotal / 1024 / 1024).toFixed(
		digits
	)}MB\nExternal: ${(memory.external / 1024 / 1024).toFixed(
		digits
	)}MB` as const;
};

export default calculateRam;
