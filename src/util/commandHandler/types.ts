import type {
	APIApplicationCommandAutocompleteInteraction,
	APIApplicationCommandInteraction,
	APIApplicationCommandInteractionDataBasicOption,
	APIApplicationCommandOption,
	APIApplicationCommandSubcommandGroupOption,
	APIApplicationCommandSubcommandOption,
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	APIInteractionResponse,
	APIMessageApplicationCommandInteraction,
	APIMessageComponentInteraction,
	APIModalSubmitInteraction,
	APIUser,
	APIUserApplicationCommandInteraction,
	InteractionResponseType,
	InteractionType,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Readonly } from "../types.ts";
import type { Command } from "./Command.ts";
import type { CommandHandler } from "./CommandHandler.ts";

export type ExtractOptionType<
	T extends Readonly<APIApplicationCommandOption> = APIApplicationCommandOption,
> = T extends {
	choices: { value: infer V }[];
}
	? V
	: (APIApplicationCommandInteractionDataBasicOption<InteractionType.ApplicationCommand> & {
			type: T["type"];
		})["value"];
export type ResolvedOptions<
	T extends Readonly<
		| APIApplicationCommandSubcommandGroupOption
		| APIApplicationCommandSubcommandOption
	>,
	S extends string | undefined = undefined,
> = T extends any
	? CreateObject<
			NonNullable<T["options"]>,
			undefined extends S ? T["name"] : `${S} ${T["name"]}`
		>
	: never;
export type CreateObject<
	T extends Readonly<APIApplicationCommandOption[]>,
	S extends string | undefined = undefined,
	R extends boolean = true,
> =
	T extends Readonly<
		(
			| APIApplicationCommandSubcommandGroupOption
			| APIApplicationCommandSubcommandOption
		)[]
	>
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
	T extends
		| Readonly<RESTPostAPIChatInputApplicationCommandsJSONBody>
		| undefined,
	R extends boolean = true,
> = RESTPostAPIChatInputApplicationCommandsJSONBody extends T
	? {
			subcommand?: string;
			options: Record<string, ExtractOptionType | undefined>;
		}
	: CreateObject<NonNullable<NonNullable<T>["options"]>, undefined, R>;

export type Reply<T extends InteractionResponseType> = (
	data?: Extract<APIInteractionResponse, { type: T }> extends { data?: infer D }
		? D
		: never,
) => void;

export type Replies = {
	[P in keyof typeof CommandHandler.ReplyTypes]: Reply<
		(typeof CommandHandler.ReplyTypes)[P]
	>;
};

export type BaseArgs<T extends APIInteraction = APIInteraction> = {
	interaction: T;
	request: Request;
	user: APIUser;
};

export type ChatInputReplies = Pick<Replies, "reply" | "defer" | "modal">;

export type ChatInputArgs<
	A extends
		Readonly<RESTPostAPIChatInputApplicationCommandsJSONBody> = RESTPostAPIChatInputApplicationCommandsJSONBody,
	B extends string | undefined = string | undefined,
> = BaseArgs<APIChatInputApplicationCommandInteraction> &
	ParseOptions<A> & {
		subcommand: B;
	};

export type AutoCompleteReplies = Pick<Replies, "autocomplete">;

export type AutoCompleteArgs<
	A extends
		Readonly<RESTPostAPIChatInputApplicationCommandsJSONBody> = RESTPostAPIChatInputApplicationCommandsJSONBody,
> = BaseArgs<APIApplicationCommandAutocompleteInteraction> & ParseOptions<A>;

export type ComponentReplies = Pick<
	Replies,
	"reply" | "defer" | "modal" | "update" | "deferUpdate"
>;

export type ComponentArgs = BaseArgs<APIMessageComponentInteraction> & {
	args: string[];
};

export type ModalReplies = Pick<Replies, "reply" | "defer">;

export type ModalArgs = BaseArgs<APIModalSubmitInteraction> & {
	args: string[];
};

export type UserReplies = Pick<Replies, "reply" | "defer" | "modal">;

export type UserArgs = BaseArgs<APIUserApplicationCommandInteraction>;

export type MessageReplies = Pick<Replies, "reply" | "defer" | "modal">;

export type MessageArgs = BaseArgs<APIMessageApplicationCommandInteraction>;

export type CommandRunners = NonNullable<
	{
		[K in keyof Command]: Command[K] extends
			| ((...args: any[]) => any)
			| undefined
			? K
			: never;
	}[keyof Command]
>;

export type Runner = (
	this: Command,
	replies: Replies,
	args: {
		interaction: APIInteraction;
		request: Request;
		user: APIUser;
		subcommand?: string;
		options?: Record<string, string | number | boolean>;
		args?: string[];
	},
) => Promise<any>;

export type CommandTests = {
	name: string;
	interaction: Partial<
		| APIApplicationCommandAutocompleteInteraction
		| APIApplicationCommandInteraction
		| APIMessageComponentInteraction
		| APIModalSubmitInteraction
	>;
	response: APIInteractionResponse;
}[];
