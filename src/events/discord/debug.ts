import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Discord, "debug"> = {
	name: "debug",
	type: EventType.Discord,
	on(info) {
		CustomClient.printToStdout(info, true);
	},
};
