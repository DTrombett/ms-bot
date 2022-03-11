import type { RestEvents } from "@discordjs/rest";
import type { Client, ClientEvents as DiscordEvents } from "discord.js";
import type { EventOptions } from ".";
import CustomClient from "./CustomClient";
import { EventType } from "./types";

/**
 * A class representing a client event
 */
export class Event<
	T extends EventType = EventType,
	K extends T extends EventType.Discord
		? keyof DiscordEvents
		: T extends EventType.Rest
		? keyof RestEvents
		: never = T extends EventType.Discord
		? keyof DiscordEvents
		: T extends EventType.Rest
		? keyof RestEvents
		: never
> {
	/**
	 * The client that instantiated this event
	 */
	readonly client: CustomClient;

	/**
	 * The name of this event
	 */
	readonly name: K;

	/**
	 * The type of this event
	 */
	readonly type: T;

	/**
	 * The function to call when this event is emitted
	 */
	on?: OmitThisParameter<NonNullable<EventOptions<T, K>["on"]>>;

	/**
	 * The function to call when this event is emitted once
	 */
	once?: Event<T, K>["on"];

	/**
	 * @param client - The client that instantiated this event
	 * @param data - The data to use to create this event
	 */
	constructor(client: CustomClient, data: EventOptions<T, K>) {
		if (!(client instanceof CustomClient))
			throw new TypeError("'client' must be a CustomClient");
		this.client = client;
		this.name = data.name;
		this.type = data.type;
		this.patch(data);
	}

	/**
	 * Patches this event with the given data.
	 * @param data - The data to use to create this event
	 */
	patch(data: Partial<EventOptions<T, K>>) {
		this.removeListeners();

		if (data.on !== undefined)
			this.on = data.on.bind<EventOptions<T, K>["on"]>(this);
		if (data.once !== undefined)
			this.once = data.once.bind<EventOptions<T, K>["once"]>(this);

		this.addListeners();

		return this;
	}

	/**
	 * Adds these listeners to the client.
	 */
	addListeners(): void {
		if (this.on)
			switch (this.type) {
				case EventType.Discord:
					this.client.on(
						this.name as keyof DiscordEvents,
						this.on as Parameters<Client["on"]>[1]
					);
					break;
				case EventType.Rest:
					this.client.rest.on(
						this.name as keyof RestEvents,
						this.on as Parameters<Client["rest"]["on"]>[1]
					);
					break;
				default:
			}
		if (this.once)
			switch (this.type) {
				case EventType.Discord:
					this.client.once(
						this.name as keyof DiscordEvents,
						this.once as Parameters<Client["once"]>[1]
					);
					break;
				case EventType.Rest:
					this.client.rest.once(
						this.name as keyof RestEvents,
						this.on as Parameters<Client["rest"]["on"]>[1]
					);
					break;
				default:
			}
	}

	/**
	 * Removes this event.
	 */
	removeListeners(): void {
		if (this.on)
			switch (this.type) {
				case EventType.Discord:
					this.client.off(
						this.name as keyof DiscordEvents,
						this.on as Parameters<Client["on"]>[1]
					);
					break;
				case EventType.Rest:
					this.client.rest.off(
						this.name as keyof RestEvents,
						this.on as Parameters<Client["rest"]["on"]>[1]
					);
					break;
				default:
			}
		if (this.once)
			switch (this.type) {
				case EventType.Discord:
					this.client.off(
						this.name as keyof DiscordEvents,
						this.once as Parameters<Client["once"]>[1]
					);
					break;
				case EventType.Rest:
					this.client.rest.off(
						this.name as keyof RestEvents,
						this.on as Parameters<Client["rest"]["on"]>[1]
					);
					break;
				default:
			}
	}
}

export default Event;
