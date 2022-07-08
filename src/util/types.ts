import type {
	APIApplicationCommandOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionType,
	RESTPostAPIApplicationCommandsJSONBody,
	Snowflake,
} from "discord-api-types/v10";
import type {
	Awaitable,
	CacheType,
	ClientEvents,
	Interaction,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { Buffer } from "node:buffer";
import type { Command, CustomClient, Event } from ".";

/**
 * List of actions and their arguments
 */
export type Actions = {
	avatar: [user: Snowflake, guild?: Snowflake];
	bann: [
		user: Snowflake,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string,
		deleteMessageDays?: `${number}`,
		duration?: string
	];
	banner: [user: Snowflake];
	bannList: [
		guild: Snowflake,
		page?: `${number}`,
		executor?: Snowflake,
		update?: `${boolean}`
	];
	calc: [expr: string, fraction?: `${boolean}`];
	cat: [];
	createEmoji: [
		guild: Snowflake,
		attachment: Buffer | string,
		name: string,
		executor?: Snowflake,
		reason?: string,
		...roles: Snowflake[]
	];
	deleteEmoji: [
		emoji: Snowflake | string,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string
	];
	dice: [count?: `${number}`];
	dog: [];
	editEmoji: [
		emoji: Snowflake | string,
		guild: Snowflake,
		name?: string,
		executor?: Snowflake,
		reason?: string,
		...roles: Snowflake[]
	];
	emojiInfo: [emoji: Snowflake | string, guild?: Snowflake];
	emojiList: [
		guild: Snowflake,
		page?: `${number}`,
		executor?: Snowflake,
		update?: `${boolean}`
	];
	google: [query: string];
	icon: [guild: Snowflake];
	kick: [
		user: Snowflake,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string
	];
	love: [
		user1: Snowflake,
		user2: Snowflake,
		discriminator1: string,
		discriminator2: string
	];
	ping: [];
	predict: [text: string];
	randomNumber: [min?: `${number}`, max?: `${number}`];
	rps: [choice: "paper" | "rock" | "scissors"];
	timeout: [
		user: Snowflake,
		guild: Snowflake,
		timeout: string | null,
		executor?: Snowflake,
		reason?: string
	];
	timestamp: [
		year?: `${number}`,
		month?: `${number}`,
		date?: `${number}`,
		hours?: `${number}`,
		minutes?: `${number}`,
		seconds?: `${number}`
	];
	unbann: [
		user: Snowflake,
		guild: Snowflake,
		executor?: Snowflake,
		reason?: string
	];
};

/**
 * A function to be called when an action is executed
 */
export type ActionMethod<
	T extends keyof Actions,
	R extends
		| InteractionReplyOptions
		| InteractionUpdateOptions
		| WebhookEditMessageOptions = InteractionUpdateOptions &
		WebhookEditMessageOptions
> = (this: void, client: CustomClient<true>, ...args: Actions[T]) => Promise<R>;

export type InteractionByType<
	T extends InteractionType,
	C extends CacheType = CacheType,
	I extends Interaction<C> = Interaction<C>
> = I extends Interaction<C> & { type: T } ? I : never;
export type CommandInteractionByType<
	T extends ApplicationCommandType,
	I extends InteractionByType<InteractionType.ApplicationCommand> = InteractionByType<InteractionType.ApplicationCommand>
> = I extends InteractionByType<InteractionType.ApplicationCommand> & {
	commandType: T;
}
	? I
	: never;

export type CommandData<
	T extends ApplicationCommandType = ApplicationCommandType,
	O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
	N extends string = string
> = RESTPostAPIApplicationCommandsJSONBody & {
	type: T;
	options?: (APIApplicationCommandOption & {
		type: O;
	})[];
	name: N;
};

/**
 * Options to create a command
 */
export type CommandOptions<
	T extends ApplicationCommandType = ApplicationCommandType,
	O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
	N extends string = string
> = {
	/**
	 * The data for this command
	 */
	data: [CommandData<T, O, N>, ...CommandData<T, O, N>[]];

	/**
	 * If this command is private
	 */
	isPrivate?: boolean;

	/**
	 * A functions to run when an autocomplete request is received by Discord.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	autocomplete?(
		this: Command,
		interaction: InteractionByType<InteractionType.ApplicationCommandAutocomplete>
	): Awaitable<void>;

	/**
	 * A function to run when an interaction from a message component with the custom_id of this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	component?(
		this: Command,
		interaction: InteractionByType<InteractionType.MessageComponent>
	): Awaitable<void>;

	/**
	 * A function to run when a modal is submitted with the custom_id of this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	modalSubmit?(
		this: Command,
		interaction: InteractionByType<InteractionType.ModalSubmit>
	): Awaitable<void>;

	/**
	 * A function to run when this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	run(
		this: Command,
		interaction: CommandInteractionByType<T> & {
			commandName: N;
			commandType: T;
		}
	): Awaitable<void>;
};

/**
 * The data for an event
 */
export type EventOptions<K extends keyof ClientEvents = keyof ClientEvents> = {
	/**
	 * The name of the event
	 */
	name: K;

	/**
	 * The function to execute when the event is received
	 */
	on?: (this: Event<K>, ...args: ClientEvents[K]) => Awaitable<void>;

	/**
	 * The function to execute when the event is received once
	 */
	once?: EventOptions<K>["on"];
};

export type ReceivedInteraction<C extends CacheType = CacheType> =
	InteractionByType<
		| InteractionType.ApplicationCommand
		| InteractionType.MessageComponent
		| InteractionType.ModalSubmit,
		C
	>;

/**
 * A response from thecatapi.com
 */
export type CatResponse = {
	breeds: [];
	categories: { id: number; name: string }[];
	height: number;
	id: string;
	url: string;
	width: number;
}[];

/**
 * Variables that can be stored in the database
 */
export type DatabaseVariables = {
	timeouts: Timeout[];
	warns: Partial<Record<string, Record<string, Warn[]>>>;
};

/**
 * A response from thedogapi.com
 */
export type DogResponse = {
	breeds: [];
	height: number;
	id: string;
	url: string;
	width: number;
}[];

/**
 * A promise for the queue
 */
export type QueuePromise = { promise: Promise<void>; resolve(): void };

/**
 * Emojis for Rock Paper Scissors
 */
export enum RPSEmojis {
	rock = "✊",
	paper = "✋",
	scissors = "✌",
}

/**
 * A timeout
 */
export type Timeout = {
	date: number;
	args: string[];
	name: string;
};

/**
 * The json representation of a member warn
 */
export type Warn = {
	createdAt: number;
	executor: Snowflake;
	reason: string;
};
