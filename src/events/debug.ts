import type { EventOptions } from "../util";

export const event: EventOptions<"debug"> = {
	name: "debug",
	on(info) {
		console.log(
			`${info} (${new Date().toLocaleString("it-IT", {
				timeZone: "Europe/Rome",
			})})`
		);
	},
};
