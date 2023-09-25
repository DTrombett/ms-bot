import { createEvent, printToStdout } from "../util";

export const debugEvent = createEvent({
	name: "debug",
	on(info) {
		printToStdout(`[${new Date().toISOString()}] ${info}`);
	},
});
