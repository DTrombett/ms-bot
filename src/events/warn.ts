import { createEvent, printToStderr } from "../util";

export const warnEvent = createEvent({
	name: "warn",
	on(warn) {
		printToStderr(warn);
	},
});
