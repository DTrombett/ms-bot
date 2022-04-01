import { setInterval } from "timers/promises";
import type { EventOptions } from "../../util";
import Constants, { calculateRam, CustomClient, EventType } from "../../util";

const label = Constants.clientOnlineLabel;

export const event: EventOptions<EventType.Discord, "ready"> = {
	name: "ready",
	type: EventType.Discord,
	async once(discordClient) {
		await discordClient.application.fetch();
		console.timeEnd(label);
		void CustomClient.printToStdout(calculateRam(), true);
		for await (const _ of setInterval(60_000))
			void CustomClient.printToStdout(calculateRam(), true);
	},
};
