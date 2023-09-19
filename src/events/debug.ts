import { createEvent, printToStdout } from "../util";

export const debugEvent = createEvent({
	name: "debug",
	on(info) {
		printToStdout(info);
	},
});
