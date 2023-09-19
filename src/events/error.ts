import { createEvent, printToStderr } from "../util";

export const errorEvent = createEvent({
	name: "error",
	on(error) {
		printToStderr(error);
	},
});
