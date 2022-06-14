import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Discord, "error"> = {
	name: "error",
	type: EventType.Discord,
	on(error) {
		CustomClient.printToStderr(error, true);
	},
};
