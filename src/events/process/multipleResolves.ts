import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Process, "multipleResolves"> = {
	name: "multipleResolves",
	type: EventType.Process,
	once(type, _, message) {
		void CustomClient.printToStderr(
			`A promise was ${type} multiple times with value`,
			true
		);
		void CustomClient.printToStderr(message, true);
		void CustomClient.printToStderr(new Error().stack, true);
	},
};
