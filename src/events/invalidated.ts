import mongoose from "mongoose";
import { exit, nextTick } from "node:process";
import { createEvent, printToStderr } from "../util";

export const invalidatedEvent = createEvent({
	name: "invalidated",
	async once() {
		printToStderr(
			"Client session became invalidated.\nClosing the process gracefully...",
		);
		await Promise.all([this.client.destroy(), mongoose.disconnect()]);
		nextTick(exit, 1);
	},
});
