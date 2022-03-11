import { spawn } from "node:child_process";
import process, { argv, cwd, exit } from "node:process";
import CustomClient from "./CustomClient";

/**
 * Restarts the process.
 * @param client The client to restart
 */
export const restart = (client: CustomClient) => {
	if (!(client instanceof CustomClient))
		throw new TypeError("Argument 'client' must be a CustomClient");
	process.once("exit", () => {
		spawn(argv[0], argv.slice(1), {
			cwd: cwd(),
			detached: true,
			stdio: "inherit",
		}).unref();
	});
	client.destroy();
	exit(0);
};

export default restart;
