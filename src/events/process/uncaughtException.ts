import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Process, "uncaughtException"> = {
	name: "uncaughtException",
	type: EventType.Process,
	on(message) {
		CustomClient.printToStderr(message, true);
	},
};
