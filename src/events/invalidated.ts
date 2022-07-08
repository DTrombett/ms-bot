import { exit, nextTick } from "node:process";
import { createEvent, CustomClient } from "../util";

export const event = createEvent({
	name: "invalidated",
	once() {
		CustomClient.printToStderr(
			"Client session became invalidated.\nClosing the process gracefully..."
		);
		this.client.destroy();
		nextTick(exit, 1);
	},
});
