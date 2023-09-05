import { exit, nextTick } from "node:process";
import { CustomClient, createEvent } from "../util";

export const invalidatedEvent = createEvent({
	name: "invalidated",
	async once() {
		CustomClient.printToStderr(
			"Client session became invalidated.\nClosing the process gracefully...",
		);
		await this.client.destroy();
		nextTick(exit, 1);
	},
});
