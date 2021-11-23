import type { EventOptions } from "../util";
import Constants from "../util";

export const event: EventOptions<"ready"> = {
	name: "ready",
	async once(client) {
		await client.application.fetch();
		console.timeEnd(Constants.ClientOnline);
	},
};
