import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Process, "warning"> = {
	name: "warning",
	type: EventType.Process,
	on(message) {
		CustomClient.printToStderr(message, true);
	},
};
