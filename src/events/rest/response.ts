import { stdout } from "process";
import { clearLine, moveCursor } from "readline";
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
		const r = `${request.method.toUpperCase()} ${request.path}` as const;
		const data = requests[r];

		if (!data) return;
		const [lines, time] = data;
		const timeout = Date.now() - time;

		moveCursor(stdout, 0, lines - CustomClient.lines++);
		clearLine(stdout, 0);
		stdout.write(
			`${r} - ${color(
				`${response.status} ${response.statusText}`,
				statusColor[Math.floor(response.status / 100) * 100]
			)} (${timeout}ms)\n`
		);
		moveCursor(stdout, 0, CustomClient.lines - lines);
		requests[r] = undefined;
	},
};
