import type {
	APIApplicationCommandAutocompleteResponse,
	APIApplicationCommandOption,
	APIInteraction,
	APIInteractionResponse,
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponseDeferredChannelMessageWithSource,
	APIInteractionResponseDeferredMessageUpdate,
	APIInteractionResponseUpdateMessage,
	APIModalInteractionResponse,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionType,
	RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";

export type Awaitable<T> = Promise<T> | T;

export type Readonly<T> = {
	readonly [P in keyof T]: Readonly<T[P]>;
};

export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};

export type InteractionByType<
	T extends InteractionType,
	I extends APIInteraction = APIInteraction,
> = I extends APIInteraction & { type: T } ? I : never;
export type CommandInteractionByType<
	T extends ApplicationCommandType,
	I extends
		InteractionByType<InteractionType.ApplicationCommand> = InteractionByType<InteractionType.ApplicationCommand>,
> = I extends InteractionByType<InteractionType.ApplicationCommand> & {
	data: { type: T };
}
	? I
	: never;

export type CommandData<
	T extends ApplicationCommandType = ApplicationCommandType,
	O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
	N extends string = string,
> = RESTPostAPIApplicationCommandsJSONBody & {
	type: T;
	options?: (APIApplicationCommandOption & {
		type: O;
	})[];
	name: N;
};

export type ReplyFunction<
	T extends APIInteractionResponse = APIInteractionResponse,
> = (result: T) => void;

export type ExecutorContext<T extends APIInteraction = APIInteraction> = {
	context: ExecutionContext;
	interaction: T;
	host: string;
};

export type Merge<A, B> = {
	[K in Exclude<keyof A, keyof B>]?: A[K];
} & {
	[K in Exclude<keyof B, keyof A>]?: B[K];
} & {
	[K in Extract<keyof A, keyof B>]: A[K] | B[K];
};

/**
 * Options to create a command
 */
export type CommandOptions<
	T extends ApplicationCommandType = ApplicationCommandType,
	O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
	N extends string = string,
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
	autocomplete?: (
		reply: ReplyFunction<APIApplicationCommandAutocompleteResponse>,
		context: ExecutorContext<
			InteractionByType<InteractionType.ApplicationCommandAutocomplete>
		>,
	) => Awaitable<void>;

	/**
	 * A function to run when an interaction from a message component with the custom_id of this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	component?: (
		reply: ReplyFunction<
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIInteractionResponseDeferredMessageUpdate
			| APIInteractionResponseUpdateMessage
			| APIModalInteractionResponse
		>,
		context: ExecutorContext<
			InteractionByType<InteractionType.MessageComponent>
		>,
	) => Awaitable<void>;

	/**
	 * A function to run when a modal is submitted with the custom_id of this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	modalSubmit?: (
		reply: ReplyFunction<
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIInteractionResponseDeferredMessageUpdate
		>,
		context: ExecutorContext<InteractionByType<InteractionType.ModalSubmit>>,
	) => Awaitable<void>;

	/**
	 * A function to run when this command is received.
	 * @param this - The command object that called this
	 * @param interaction - The interaction received
	 */
	run: (
		reply: ReplyFunction<
			| APIInteractionResponseChannelMessageWithSource
			| APIInteractionResponseDeferredChannelMessageWithSource
			| APIModalInteractionResponse
		>,
		context: ExecutorContext<CommandInteractionByType<T>>,
	) => Awaitable<void>;
};

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
 * A response from thedogapi.com
 */
export type DogResponse = {
	breeds: [];
	height: number;
	id: string;
	url: string;
	width: number;
}[];

export enum MatchStatus {
	ToBePlayed,
	Live,
	Finished,
	Postponed,
}

export type Match = {
	home_goal: number | null;
	away_goal: number | null;
	home_team_name: Uppercase<string>;
	away_team_name: Uppercase<string>;
	date_time: string;
	match_status: MatchStatus;
	slug: string;
	match_id: number;
	match_name: string;
	match_day_id_category: number;
	match_day_order: `${number}`;
};
export type MatchesData =
	| {
			success: true;
			data: Match[];
	  }
	| { success: false; message: string; errors: unknown[] };
export type MatchDay = {
	category_status: "LIVE" | "PLAYED" | "TO BE PLAYED";
	title: `Matchday ${number}`;
	id_category: number;
};
export type MatchDayResponse =
	| {
			success: false;
			message: string;
			errors: Rpc.Serializable<unknown>[];
	  }
	| {
			success: true;
			data: MatchDay[];
	  };

export type CommentaryResponse = {
	success: boolean;
	message: string;
	errors: {
		type: string;
		message: string;
		params: unknown[];
	}[];
	data: {
		messages: {
			comment: string;
			id: string;
			lastModified: string;
			minute: string;
			period: string;
			second: string;
			time: string;
			type: string;
			varCheck: string;
		}[];
	};
};

export type Leaderboard = [
	user: ResolvedUser,
	matchPoints: number,
	dayPoints: number,
	maxPoints: number,
][];

export type Prediction = {
	matchId: number;
	userId: string;
	prediction: string;
};
export type User = {
	id: string;
	dayPoints?: number | null;
	matchPointsHistory?: string | null;
	match?: number | null;
	remindMinutes?: number | null;
};
export type Reminder = {
	id: string;
	date: string;
	userId: string;
	remind: string;
};

export type ResolvedUser = Pick<
	User,
	"dayPoints" | "id" | "match" | "matchPointsHistory"
> & {
	predictions: Pick<Prediction, "matchId" | "prediction">[];
};
