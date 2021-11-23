import Collection from "@discordjs/collection";
import type { Client } from "discord.js";
import { promises } from "node:fs";
import { join } from "node:path";
import type { EventOptions } from ".";
import Constants from "./Constants";
import Event from "./Event";

export const events = new Collection<string, Event>();

/**
 * Load events listeners for the client.
 * @param client - The client to load the events for
 */
export const loadEvents = (client: Client) =>
	promises
		.readdir(join(__dirname, "..", Constants.Events))
		.then((fileNames) =>
			Promise.all(
				fileNames
					.filter((fileName) => fileName.endsWith(".js"))
					.map(
						(fileName) =>
							import(
								join(__dirname, "..", Constants.Events, fileName)
							) as Promise<{
								event: EventOptions;
							}>
					)
			)
		)
		.then((files) => files.map((file) => file.event))
		.then((eventsOptions) => {
			for (const event of eventsOptions) {
				const existing = events.get(event.name);

				if (existing !== undefined) existing.patch(event);
				else events.set(event.name, new Event(client, event));
			}
		});

export default loadEvents;
