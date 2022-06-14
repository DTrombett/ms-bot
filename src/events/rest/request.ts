import type { EventOptions } from "../../util";
import { Color, color, CustomClient, EventType } from "../../util";

export const requests: {
	[key: `${string} /${string}`]: number | undefined;
} = {};

export const event: EventOptions<EventType.Rest, "request"> = {
	name: "request",
	type: EventType.Rest,
	on(options) {
		const text = `${options.method} ${options.fullRoute}` as const;

		requests[text] = Date.now();
		CustomClient.printToStdout(
			color(
				`${text}${options.query ? `?${options.query.toString()}` : ""}`,
				Color.Black
			)
		);
	},
};
