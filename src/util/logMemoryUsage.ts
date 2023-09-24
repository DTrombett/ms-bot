import { env, memoryUsage } from "node:process";
import { setInterval } from "node:timers/promises";
import { printToStdout } from "./logger";

export const logMemoryUsage = async () => {
	for await (const _ of setInterval(
		60_000 * (env.NODE_ENV === "production" ? 10 : 1),
	)) {
		const memory = memoryUsage();

		printToStdout(
			`RSS: ${(memory.rss / 1000 / 1000).toFixed(3)}MB\nHeap Used: ${(
				memory.heapUsed /
				1000 /
				1000
			).toFixed(3)}MB\nHeap Total: ${(memory.heapTotal / 1000 / 1000).toFixed(
				3,
			)}MB\nExternal: ${(memory.external / 1000 / 1000).toFixed(3)}MB`,
		);
	}
};

export default logMemoryUsage;
