import type {
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import type { RestEvents } from "@discordjs/rest";
import type { Snowflake } from "discord-api-types/v10";
import type {
	AutocompleteInteraction,
	Awaitable,
	ChatInputCommandInteraction,
	ClientEvents,
	InteractionReplyOptions,
	InteractionUpdateOptions,
	MessageOptions,
	WebhookEditMessageOptions,
} from "discord.js";
import type { Buffer } from "node:buffer";
import type { IncomingHttpHeaders } from "node:http";
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
	rps: [choice: "paper" | "rock" | "scissors"];
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

/**
 * An action row to be sent to Discord
 */
export type ActionRowType = NonNullable<
	MessageOptions["components"]
> extends (infer T)[]
	? T
	: never;

/**
 * Options to create a command
 */
export type CommandOptions = {
	/**
	 * The data for this command
	 */
	data:
		| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
		| SlashCommandBuilder
		| SlashCommandSubcommandsOnlyBuilder;

	/**
	 * If this command is public
	 */
	isPublic?: boolean;

	/**
	 * A functions to run when an autocomplete request is received by Discord.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	autocomplete?(
		this: Command,
		interaction: AutocompleteInteraction
	): Awaitable<void>;

	/**
	 * A function to run when this command is received by Discord.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	run(this: Command, interaction: ChatInputCommandInteraction): Awaitable<void>;
};

/**
 * Type of content received from a web request
 */
export enum ContentType {
	Json,
	PlainText,
	Buffer,
}

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
 * Custom emojis for the bot
 */

export enum CustomEmojis {}

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
 * The data for an event
 */
export type EventOptions<
	T extends EventType = EventType,
	K extends T extends EventType.Discord
		? keyof ClientEvents
		: T extends EventType.Process
		? keyof ProcessEvents
		: T extends EventType.Rest
		? keyof RestEvents
		: never = T extends EventType.Discord
		? keyof ClientEvents
		: T extends EventType.Process
		? keyof ProcessEvents
		: T extends EventType.Rest
		? keyof RestEvents
		: never
> = {
	/**
	 * The name of the event
	 */
	name: K;

	/**
	 * The type of the event
	 */
	type: T;

	/**
	 * The function to execute when the event is received
	 */
	on?: (
		this: Event<T, K>,
		...args: T extends EventType.Discord
			? K extends keyof ClientEvents
				? ClientEvents[K]
				: never
			: T extends EventType.Process
			? K extends keyof ProcessEvents
				? ProcessEvents[K]
				: never
			: T extends EventType.Rest
			? K extends keyof RestEvents
				? RestEvents[K]
				: never
			: never
	) => Awaitable<void>;

	/**
	 * The function to execute when the event is received once
	 */
	once?: EventOptions<T, K>["on"];
};

/**
 * The type for an event
 */
export enum EventType {
	Discord = "discord",
	Process = "process",
	Rest = "rest",
}

/**
 * All the face emojis
 */
export enum FaceEmojis {
	":)" = "😊",
	":D" = "😀",
	":P" = "😛",
	":O" = "😮",
	":*" = "😗",
	";)" = "😉",
	":|" = "😐",
	":/" = "😕",
	":S" = "😖",
	":$" = "😳",
	":@" = "😡",
	":^)" = "😛",
	":\\" = "😕",
}

/**
 * The match level from comparing 2 strings
 */
export enum MatchLevel {
	/**
	 * The strings don't match at all
	 */
	None,

	/**
	 * The second string is a substring of the first one
	 */
	Partial,

	/**
	 * The second string is at the end of the first one
	 */
	End,

	/**
	 * The second string is at the beginning of the first one
	 */
	Start,

	/**
	 * The second string is the same as the first one
	 */
	Full,
}

export type ProcessEvents = {
	[K in Signals]: [signal: K];
} & {
	beforeExit: [code: number];
	disconnect: [];
	exit: [code: number];
	message: [message: unknown, sendHandle: unknown];
	rejectionHandled: [promise: Promise<unknown>];
	uncaughtException: [
		error: Error,
		origin: "uncaughtException" | "unhandledRejection"
	];
	uncaughtExceptionMonitor: [
		error: Error,
		origin: "uncaughtException" | "unhandledRejection"
	];
	unhandledRejection: [reason: unknown, promise: Promise<unknown>];
	warning: [warning: Error];
	worker: [worker: Worker];
};

/**
 * A promise for the queue
 */
export type QueuePromise = { promise: Promise<void>; resolve(): void };

/**
 * A response from a web request
 */
export type RequestResponse<R> = {
	data: R;
	complete: boolean;
	headers: IncomingHttpHeaders;
	statusCode: number;
	statusMessage: string;
};

/**
 * Emojis for Rock Paper Scissors
 */
export enum RPSEmojis {
	rock = "✊",
	paper = "✋",
	scissors = "✌",
}

/**
 * Nodejs signals
 */
export type Signals =
	| "SIGABRT"
	| "SIGALRM"
	| "SIGBREAK"
	| "SIGBUS"
	| "SIGCHLD"
	| "SIGCONT"
	| "SIGFPE"
	| "SIGHUP"
	| "SIGILL"
	| "SIGINFO"
	| "SIGINT"
	| "SIGIO"
	| "SIGIOT"
	| "SIGKILL"
	| "SIGLOST"
	| "SIGPIPE"
	| "SIGPOLL"
	| "SIGPROF"
	| "SIGPWR"
	| "SIGQUIT"
	| "SIGSEGV"
	| "SIGSTKFLT"
	| "SIGSTOP"
	| "SIGSYS"
	| "SIGTERM"
	| "SIGTRAP"
	| "SIGTSTP"
	| "SIGTTIN"
	| "SIGTTOU"
	| "SIGUNUSED"
	| "SIGURG"
	| "SIGUSR1"
	| "SIGUSR2"
	| "SIGVTALRM"
	| "SIGWINCH"
	| "SIGXCPU"
	| "SIGXFSZ";

/**
 * A timeout
 */
export type Timeout = {
	date: number;
	args: string[];
	name: string;
};

/**
 * A valid url
 */
export type Url = URL | `http${"" | "s"}://${string}`;

/**
 * The json representation of a member warn
 */
export type Warn = {
	createdAt: number;
	executor: Snowflake;
	reason: string;
};
