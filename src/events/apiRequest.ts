import type { EventOptions } from "../util";

export const event: EventOptions<"apiRequest"> = {
	name: "apiRequest",
	on(request) {
		console.log(
			`${request.method.toUpperCase()} ${
				request.path
			} (${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })})`
		);
	},
};
