import { createEvent, CustomClient } from "../util";

export const debugEvent = createEvent({
	name: "debug",
	on(info) {
		CustomClient.printToStdout(info);
	},
});
