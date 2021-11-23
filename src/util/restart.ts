import type { Client } from "discord.js";
import { spawn } from "node:child_process";

/**
 * Restarts the process.
 * @param client The client to restart
 */
export const restart = (client: Client) => {
	process.once("exit", () => {
		spawn(process.argv[0], process.argv.slice(1), {
			cwd: process.cwd(),
			detached: true,
			stdio: "inherit",
		}).unref();
	});
	client.destroy();
	process.exit(0);
};

export default restart;
