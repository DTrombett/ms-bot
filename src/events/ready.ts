import { Constants, createEvent } from "../util";

export const event = createEvent({
	name: "ready",
	async once(discordClient) {
		await discordClient.application.fetch();
		// eslint-disable-next-line no-console
		console.timeEnd(Constants.clientOnlineLabel);
	},
});
