import { createEvent, CustomClient } from "../util";

export const warnEvent = createEvent({
	name: "warn",
	on(warn) {
		CustomClient.printToStderr(warn);
	},
});
