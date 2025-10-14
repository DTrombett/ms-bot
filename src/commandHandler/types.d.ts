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
import type { Command } from "./Command.ts";
import type { CommandHandler } from "./CommandHandler.ts";

declare global {
	type ExtractOptionType<
		T extends
			RecursiveReadonly<APIApplicationCommandOption> = APIApplicationCommandOption,
	> = T extends {
		choices: { value: infer V }[];
	}
		? V
		: (APIApplicationCommandInteractionDataBasicOption<InteractionType.ApplicationCommand> & {
				type: T["type"];
			})["value"];
	type ResolvedOptions<
		T extends RecursiveReadonly<
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
	type CreateObject<
		T extends RecursiveReadonly<APIApplicationCommandOption[]>,
		S extends string | undefined = undefined,
		R extends boolean = true,
	> =
		T extends RecursiveReadonly<
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
	type ParseOptions<
		T extends
			| RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody>
			| undefined,
		R extends boolean = true,
	> = RESTPostAPIChatInputApplicationCommandsJSONBody extends T
		? {
				subcommand?: string;
				options: Record<string, ExtractOptionType | undefined>;
			}
		: CreateObject<NonNullable<NonNullable<T>["options"]>, undefined, R>;

	type Reply<T extends InteractionResponseType> = (
		data?: Extract<APIInteractionResponse, { type: T }> extends {
			data?: infer D;
		}
			? D
			: never,
	) => void;

	type Replies = {
		[P in keyof typeof CommandHandler.ReplyTypes]: Reply<
			(typeof CommandHandler.ReplyTypes)[P]
		>;
	};

	type BaseArgs<T extends APIInteraction = APIInteraction> = {
		interaction: T;
		request: Request;
		user: APIUser;
	};

	type ChatInputReplies = Pick<Replies, "reply" | "defer" | "modal">;

	type ChatInputArgs<
		A extends
			RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody> = RESTPostAPIChatInputApplicationCommandsJSONBody,
		B extends string | undefined = string | undefined,
	> = BaseArgs<APIChatInputApplicationCommandInteraction> &
		ParseOptions<A> & {
			subcommand: B;
		};

	type AutoCompleteReplies = Pick<Replies, "autocomplete">;

	type AutoCompleteArgs<
		A extends
			RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody> = RESTPostAPIChatInputApplicationCommandsJSONBody,
	> = BaseArgs<APIApplicationCommandAutocompleteInteraction> & ParseOptions<A>;

	type ComponentReplies = Pick<
		Replies,
		"reply" | "defer" | "modal" | "update" | "deferUpdate"
	>;

	type ComponentArgs = BaseArgs<APIMessageComponentInteraction> & {
		args: string[];
	};

	type ModalReplies = Pick<Replies, "reply" | "defer">;

	type ModalArgs = BaseArgs<APIModalSubmitInteraction> & {
		args: string[];
	};

	type UserReplies = Pick<Replies, "reply" | "defer" | "modal">;

	type UserArgs = BaseArgs<APIUserApplicationCommandInteraction>;

	type MessageReplies = Pick<Replies, "reply" | "defer" | "modal">;

	type MessageArgs = BaseArgs<APIMessageApplicationCommandInteraction>;

	type CommandRunners = NonNullable<
		{
			[K in keyof Command]: Command[K] extends
				| ((...args: any[]) => any)
				| undefined
				? K
				: never;
		}[keyof Command]
	>;

	type Runner = (
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

	type CommandTests = {
		name: string;
		interaction: Partial<
			| APIApplicationCommandAutocompleteInteraction
			| APIApplicationCommandInteraction
			| APIMessageComponentInteraction
			| APIModalSubmitInteraction
		>;
		response: APIInteractionResponse;
	}[];
}
