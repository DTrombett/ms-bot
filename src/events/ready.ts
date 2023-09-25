import { Constants, createEvent, loadQuotes, loadTimeouts } from "../util";

export const readyEvent = createEvent({
	name: "ready",
	async once(client) {
		await Promise.all([
			client.application.fetch(),
			loadQuotes(this.client),
			loadTimeouts(this.client),
		]);
		// eslint-disable-next-line no-console
		console.timeEnd(Constants.clientOnlineLabel);
	},
});
