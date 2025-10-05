import {
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Env, Readonly } from "../types";
import type {
	AutoCompleteArgs as AutocompleteArgs,
	AutoCompleteReplies as AutocompleteReplies,
	ChatInputArgs,
	ChatInputReplies,
	ComponentArgs,
	ComponentReplies,
	MessageArgs,
	MessageReplies,
	ModalArgs,
	ModalReplies,
	UserArgs,
	UserReplies,
} from "./types";

export class Command {
	static readonly chatInputData?: Readonly<RESTPostAPIChatInputApplicationCommandsJSONBody>;
	static readonly contextMenuData?: Readonly<
		RESTPostAPIContextMenuApplicationCommandsJSONBody[]
	>;
	static readonly customId?: string;
	private?: boolean;
	constructor(
		protected ctx: ExecutionContext,
		protected env: Env,
	) {}
	chatInput?(replies: ChatInputReplies, args: ChatInputArgs): any;
	autocomplete?(replies: AutocompleteReplies, args: AutocompleteArgs): any;
	component?(replies: ComponentReplies, args: ComponentArgs): any;
	modal?(replies: ModalReplies, args: ModalArgs): any;
	user?(replies: UserReplies, args: UserArgs): any;
	message?(replies: MessageReplies, args: MessageArgs): any;
}
