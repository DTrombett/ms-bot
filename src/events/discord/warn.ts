import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Discord, "warn"> = {
	name: "warn",
	type: EventType.Discord,
	on(warn) {
		CustomClient.printToStderr(warn, true);
	},
};
