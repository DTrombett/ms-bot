import { createEvent, CustomClient } from "../util";

export const event = createEvent({
	name: "error",
	on(error) {
		CustomClient.printToStderr(error);
	},
});
