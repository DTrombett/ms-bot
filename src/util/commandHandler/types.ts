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
> = T extends (
	| APIApplicationCommandSubcommandGroupOption
	| APIApplicationCommandSubcommandOption
)[]
	? ResolvedOptions<T[number], S>
	: {
			subcommand: S;
			options: {
				[P in T[number] as P["name"]]: P["required"] extends true
					? ExtractOptionType<P>
					: ExtractOptionType<P> | undefined;
			};
		};
export type ParseOptions<
	T extends RESTPostAPIChatInputApplicationCommandsJSONBody | undefined,
> = CreateObject<NonNullable<NonNullable<T>["options"]>>;

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
		args: {
			interaction: APIChatInputApplicationCommandInteraction;
			request: Request;
		},
	): Awaitable<void>;
	autocomplete?(
		this: ThisArg & this,
		replies: Pick<Replies, "autocomplete">,
		args: {
			interaction: APIApplicationCommandAutocompleteInteraction;
			request: Request;
		},
	): Awaitable<void>;
	component?(
		this: ThisArg & this,
		replies: Pick<
			Replies,
			"reply" | "defer" | "modal" | "update" | "deferUpdate"
		>,
		args: {
			interaction: APIMessageComponentInteraction;
			request: Request;
		},
	): Awaitable<void>;
	modal?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer">,
		args: {
			interaction: APIModalSubmitInteraction;
			request: Request;
		},
	): Awaitable<void>;
	user?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer" | "modal">,
		args: {
			interaction: APIUserApplicationCommandInteraction;
			request: Request;
		},
	): Awaitable<void>;
	message?(
		this: ThisArg & this,
		replies: Pick<Replies, "reply" | "defer" | "modal">,
		args: {
			interaction: APIMessageApplicationCommandInteraction;
			request: Request;
		},
	): Awaitable<void>;
}
