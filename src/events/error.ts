import type { EventOptions } from "../util";

export const event: EventOptions<"error"> = {
	name: "error",
	on(error) {
		console.error(error);
	},
};
