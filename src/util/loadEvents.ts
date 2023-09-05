import type { CustomClient, EventOptions } from ".";
import Event from "./Event";

/**
 * Load events listeners for the client.
 * @param client - The client to load the events for
 */
export const loadEvents = async (client: CustomClient) => {
	client.events.mapValues((event) => {
		event.removeListeners();
	});
	client.events.clear();
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	for (const event of Object.values(
		await import(`./events/index.js?${Date.now()}`),
	) as EventOptions[])
		client.events.set(event.name, new Event(client, event));
};

export default loadEvents;
