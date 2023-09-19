import type { ClientEvents } from "discord.js";
import type { CustomClient, EventOptions } from ".";

/**
 * A class representing a client event
 */
export class Event<K extends keyof ClientEvents = keyof ClientEvents> {
	/**
	 * The client that instantiated this event
	 */
	readonly client: CustomClient;

	/**
	 * The name of this event
	 */
	readonly name: K;

	/**
	 * The function to call when this event is emitted
	 */
	on?: OmitThisParameter<NonNullable<EventOptions<K>["on"]>>;

	/**
	 * The function to call when this event is emitted once
	 */
	once?: Event<K>["on"];

	/**
	 * @param client - The client that instantiated this event
	 * @param data - The data to use to create this event
	 */
	constructor(client: CustomClient, data: EventOptions<K>) {
		this.client = client;
		this.name = data.name;
		this.patch(data);
	}

	/**
	 * Patches this event with the given data.
	 * @param data - The data to use to create this event
	 */
	patch(data: Partial<EventOptions<K>>) {
		this.removeListeners();
		if (data.on !== undefined)
			this.on = data.on.bind<EventOptions<K>["on"]>(this);
		if (data.once !== undefined)
			this.once = data.once.bind<EventOptions<K>["once"]>(this);
		this.addListeners();
		return this;
	}

	/**
	 * Adds the listeners to the client.
	 */
	addListeners(): void {
		if (this.on) this.client.on(this.name, this.on);
		if (this.once) this.client.once(this.name, this.once);
	}

	/**
	 * Removes the listeners from the client.
	 */
	removeListeners(): void {
		if (this.on) this.client.off(this.name, this.on);
		if (this.once) this.client.off(this.name, this.once);
	}
}

export default Event;
