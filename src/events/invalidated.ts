import mongoose from "mongoose";
import { exit, nextTick } from "node:process";
import { CustomClient, createEvent } from "../util";

export const invalidatedEvent = createEvent({
	name: "invalidated",
	async once() {
		CustomClient.printToStderr(
			"Client session became invalidated.\nClosing the process gracefully...",
		);
		await Promise.all([this.client.destroy(), mongoose.disconnect()]);
		nextTick(exit, 1);
	},
});
