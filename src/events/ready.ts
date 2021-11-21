import type { EventOptions } from "../util";
import Constants, { loadCommands } from "../util";

export const event: EventOptions<"ready"> = {
	name: "ready",
	async once(client) {
		await Promise.all([client.application.fetch(), loadCommands(client)]);
		console.timeEnd(Constants.ClientOnline);
	},
};
