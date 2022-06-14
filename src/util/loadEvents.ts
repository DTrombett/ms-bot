import { promises } from "node:fs";
import { join } from "node:path";
import { URL } from "node:url";
import type { CustomClient, EventOptions, EventType } from ".";
import Constants from "./Constants";
import Event from "./Event";

/**
 * Load events listeners for the client.
 * @param client - The client to load the events for
 * @param subfolder - The subfolder to load the events from
 */
export const loadEvents = async (
	client: CustomClient,
	subfolder: EventType
) => {
	const fileNames = await promises.readdir(
		new URL(join(Constants.eventsFolderName, subfolder), import.meta.url)
	);
	const files = await Promise.all(
		fileNames
			.filter((fileName) => fileName.endsWith(".js"))
			.map(
				(fileName) =>
					import(
						`./${Constants.eventsFolderName}/${subfolder}/${fileName}`
					) as Promise<{
						event: EventOptions;
					}>
			)
	);
	const events = files.map((file) => file.event);
	for (const event of events)
		client.events.set(event.name, new Event(client, event));
};

export default loadEvents;
