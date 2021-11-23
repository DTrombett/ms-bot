import type { EventOptions } from "../util";

export const event: EventOptions<"warn"> = {
	name: "warn",
	on(info) {
		console.log(
			`WARNING: ${info} (${new Date().toLocaleString("it-IT", {
				timeZone: "Europe/Rome",
			})})`
		);
	},
};
