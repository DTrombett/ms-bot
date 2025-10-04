import {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteractionDataBasicOption,
	APIApplicationCommandOption,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	APIInteractionResponse,
	APIMessageApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIUserApplicationCommandInteraction,
	InteractionResponseType,
	InteractionType,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
	type APIInteraction,
	type APIUser,
} from "discord-api-types/v10";
import type { Awaitable, Env } from "../types";

export type ExtractOptionType<T extends APIApplicationCommandOption> =
	T extends {
		choices: { value: infer V }[];
	}
		? V
		: (APIApplicationCommandInteractionDataBasicOption<InteractionType.ApplicationCommand> & {
				type: T["type"];
			})["value"];
export type ResolvedOptions<
	T extends
		| APIApplicationCommandSubcommandGroupOption
		| APIApplicationCommandSubcommandOption,
	S extends string | undefined = undefined,
> = T extends any
	? CreateObject<
			NonNullable<T["options"]>,
			undefined extends S ? T["name"] : `${S} ${T["name"]}`
		>
	: never;
export type CreateObject<
	T extends APIApplicationCommandOption[],
	S extends string | undefined = undefined,
	R extends boolean = true,
> = T extends (
	| APIApplicationCommandSubcommandGroupOption
	| APIApplicationCommandSubcommandOption
)[]
	? ResolvedOptions<T[number], S>
	: {
			subcommand: S;
			options: {
				[P in T[number] as P["name"]]: R extends true
					? P["required"] extends true
						? ExtractOptionType<P>
						: ExtractOptionType<P> | undefined
					: ExtractOptionType<P> | undefined;
			};
		};
export type ParseOptions<
	T extends RESTPostAPIChatInputApplicationCommandsJSONBody | undefined,
	R extends boolean = true,
> = CreateObject<NonNullable<NonNullable<T>["options"]>, undefined, R>;

export type ThisArg = {
	ctx: ExecutionContext;
	env: Env;
};

export type Reply<T extends InteractionResponseType> = (
	data: Extract<APIInteractionResponse, { type: T }> extends { data?: infer D }
		? D
		: never,
) => void;

export const ReplyTypes = {
	reply: InteractionResponseType.ChannelMessageWithSource,
	defer: InteractionResponseType.DeferredChannelMessageWithSource,
	modal: InteractionResponseType.Modal,
	autocomplete: InteractionResponseType.ApplicationCommandAutocompleteResult,
	update: InteractionResponseType.UpdateMessage,
	deferUpdate: InteractionResponseType.DeferredMessageUpdate,
} as const;

export type Replies = {
	[P in keyof typeof ReplyTypes]: Reply<(typeof ReplyTypes)[P]>;
};

export type BaseArgs<T extends APIInteraction = APIInteraction> = {
	interaction: T;
	request: Request;
	user: APIUser;
};

export interface Command<
	A extends RESTPostAPIChatInputApplicationCommandsJSONBody,
	B extends RESTPostAPIContextMenuApplicationCommandsJSONBody[],
> {
	chatInputData?: A;
	contextMenuData?: B;
	customId?: string;
	private?: boolean;
	chatInput?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer" | "modal">,
		args: BaseArgs<APIChatInputApplicationCommandInteraction> & ParseOptions<A>,
	): Awaitable<void>;
	autocomplete?(
		this: ThisArg & this,
		replies: Pick<Replies, "autocomplete">,
		args: BaseArgs<APIApplicationCommandAutocompleteInteraction> &
			ParseOptions<A>,
	): Awaitable<void>;
	component?(
		this: ThisArg & this,
		replies: Pick<
			Replies,
			"reply" | "defer" | "modal" | "update" | "deferUpdate"
		>,
		args: BaseArgs<APIMessageComponentInteraction> & { args: string[] },
	): Awaitable<void>;
	modal?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer">,
		args: BaseArgs<APIModalSubmitInteraction> & { args: string[] },
	): Awaitable<void>;
	user?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer" | "modal">,
		args: BaseArgs<APIUserApplicationCommandInteraction>,
	): Awaitable<void>;
	message?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer" | "modal">,
		args: BaseArgs<APIMessageApplicationCommandInteraction>,
	): Awaitable<void>;
}
export type CommandRunners = NonNullable<
	{
		[K in keyof Command<
			RESTPostAPIChatInputApplicationCommandsJSONBody,
			RESTPostAPIContextMenuApplicationCommandsJSONBody[]
		>]: Command<
			RESTPostAPIChatInputApplicationCommandsJSONBody,
			RESTPostAPIContextMenuApplicationCommandsJSONBody[]
		>[K] extends ((...args: any[]) => Awaitable<void>) | undefined
			? K
			: never;
	}[keyof Command<
		RESTPostAPIChatInputApplicationCommandsJSONBody,
		RESTPostAPIContextMenuApplicationCommandsJSONBody[]
	>]
>;
