import { URLSearchParams } from "node:url";
import type { EventOptions } from "../../util";
import { color, Color, CustomClient, EventType } from "../../util";
import { requests } from "./request";

const statusColor: Record<number, Color> = {
	100: Color.Cyan,
	200: Color.Green,
	300: Color.Brown,
	400: Color.Red,
	500: Color.Magenta,
};

export const event: EventOptions<EventType.Rest, "response"> = {
	name: "response",
	type: EventType.Rest,
	on(request, response) {
		const r = `${request.method} ${request.path}` as const;
		const time = requests[r];

		if (time === undefined) return;
		CustomClient.printToStdout(
			`${r}${
				request.options.query
					? `?${new URLSearchParams(request.options.query).toString()}`
					: ""
			} - ${color(
				`${response.statusCode}`,
				statusColor[Math.floor(response.statusCode / 100) * 100]
			)} (${Date.now() - time}ms)`
		);
		delete requests[r];
	},
};
