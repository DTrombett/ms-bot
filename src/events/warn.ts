import { createEvent, CustomClient } from "../util";

export const event = createEvent({
	name: "warn",
	on(warn) {
		CustomClient.printToStderr(warn);
	},
});
