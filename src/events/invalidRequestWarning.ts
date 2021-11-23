import type { EventOptions } from "../util";

export const event: EventOptions<"invalidRequestWarning"> = {
	name: "invalidRequestWarning",
	once(data) {
		console.log(
			`Bot is shutting down due to too many invalid requests (${new Date().toLocaleString(
				"it-IT",
				{ timeZone: "Europe/Rome" }
			)})`
		);
		console.log(
			`Invalid requests: ${data.count}\nRemaining time: ${data.remainingTime}`
		);
		this.client.destroy();
		process.exit(1);
	},
};
