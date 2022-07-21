import { createEvent, CustomClient } from "../util";

export const event = createEvent({
	name: "debug",
	on(info) {
		CustomClient.printToStdout(info);
	},
});
