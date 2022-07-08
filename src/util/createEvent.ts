import type { ClientEvents } from "discord.js";
import type { EventOptions } from "./types";

/**
 * This utility function is just to infer automatically event types from the data.
 * @param event - The event data
 * @returns The event data
 */
export const createEvent = <K extends keyof ClientEvents>(
	event: EventOptions<K>
) => event;

export default createEvent;
