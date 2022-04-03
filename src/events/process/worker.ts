import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Process, "worker"> = {
	name: "worker",
	type: EventType.Process,
	on() {
		void CustomClient.printToStdout("New worker created!", true);
	},
};
