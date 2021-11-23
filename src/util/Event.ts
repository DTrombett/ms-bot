import type { Client, ClientEvents } from "discord.js";
import { join } from "node:path";
import type { EventOptions } from ".";
import Constants from "./Constants";

/**
 * A class representing a ClientRoyale event
 */
export class Event<T extends keyof ClientEvents = keyof ClientEvents> {
	/**
	 * The client that instantiated this event
	 */
	readonly client: Client;

	/**
	 * The name of this event
	 */
	readonly name: T;

	/**
	 * The function to call when this event is emitted
	 */
	on?: OmitThisParameter<NonNullable<EventOptions<T>["on"]>>;

	/**
	 * The function to call when this event is emitted once
	 */
	once?: Event<T>["on"];

	/**
	 * @param client - The client that instantiated this event
	 * @param data - The data to use to create this event
	 */
	constructor(client: Client, data: EventOptions<T>) {
		this.client = client;
		this.name = data.name;
		this.patch(data);
	}

	/**
	 * Patches this event with the given data.
	 * @param data - The data to use to create this event
	 */
	patch(data: Partial<EventOptions<T>>) {
		this.remove();

		if (data.on !== undefined)
			this.on = data.on.bind<EventOptions<T>["on"]>(this);
		if (data.once !== undefined)
			this.once = data.once.bind<EventOptions<T>["once"]>(this);

		this.addListeners();

		return this;
	}

	/**
	 * Adds these listeners to the client.
	 */
	addListeners(): void {
		if (this.on) this.client.on(this.name, this.on);
		if (this.once) this.client.once(this.name, this.once);
	}

	/**
	 * Emits this event.
	 * @param args - The arguments to pass to the event
	 */
	emit(...args: ClientEvents[T]): boolean {
		return this.client.emit(this.name, ...args);
	}

	/**
	 * Reloads this event.
	 * @returns The new event
	 */
	async reload(): Promise<this> {
		const path = join(__dirname, "..", Constants.Events, `${this.name}.js`);
		delete require.cache[require.resolve(path)];

		return this.patch(
			((await import(path)) as { event: EventOptions<T> }).event
		);
	}

	/**
	 * Removes this event.
	 */
	remove(): void {
		if (this.on) this.client.off(this.name, this.on);
		if (this.once) this.client.off(this.name, this.once);
	}

	/**
	 * Checks if this event has the once listener attached.
	 */
	hasOnceListener(): this is this & { once: NonNullable<Event<T>["once"]> } {
		return Boolean(
			this.once && this.client.listeners(this.name).includes(this.once)
		);
	}

	/**
	 * Checks if this event has the on listener attached.
	 */
	hasOnListener(): this is this & { on: NonNullable<Event<T>["on"]> } {
		return Boolean(
			this.on && this.client.listeners(this.name).includes(this.on)
		);
	}
}

export default Event;
