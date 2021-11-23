import type { EventOptions } from "../util";

export const event: EventOptions<"invalidated"> = {
	name: "invalidated",
	once() {
		console.log(
			`(${new Date().toLocaleString("it-IT", {
				timeZone: "Europe/Rome",
			})}) Bot session invalidated! The process is exiting...`
		);
		process.exit(1);
	},
};
