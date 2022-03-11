import { setTimeout } from "node:timers/promises";
import type { EventOptions } from "../../util";
import { CustomClient, EventType } from "../../util";

export const event: EventOptions<EventType.Rest, "invalidRequestWarning"> = {
	name: "invalidRequestWarning",
	type: EventType.Rest,
	async on(data) {
		void CustomClient.printToStderr(
			"Reaching the 10k invalid requests limit. Waiting for the count to reset before trying to do any action",
			true
		);
		this.client.blocked = true;
		await setTimeout(data.remainingTime);
		this.client.blocked = false;
	},
};
