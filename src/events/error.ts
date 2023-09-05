import { createEvent, CustomClient } from "../util";

export const errorEvent = createEvent({
	name: "error",
	on(error) {
		CustomClient.printToStderr(error);
	},
});
