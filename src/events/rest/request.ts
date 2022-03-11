import type { EventOptions } from "../../util";
import { Color, color, CustomClient, EventType } from "../../util";

export const requests: {
	[key: `${string} /${string}`]: [number, number] | undefined;
} = {};

export const event: EventOptions<EventType.Rest, "request"> = {
	name: "request",
	type: EventType.Rest,
	on(request) {
		const text = `${request.method.toUpperCase()} ${request.path}` as const;

		requests[text] = [CustomClient.lines, Date.now()];
		void CustomClient.printToStdout(color(text, Color.Red));
	},
};
