import {
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Readonly } from "../types.ts";
import type { CommandHandler } from "./CommandHandler.ts";
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
} from "./types.ts";

export class Command {
	static readonly chatInputData?: Readonly<RESTPostAPIChatInputApplicationCommandsJSONBody>;
	static readonly contextMenuData?: Readonly<
		RESTPostAPIContextMenuApplicationCommandsJSONBody[]
	>;
	static readonly customId?: string;
	static readonly private?: boolean;
	readonly supportComponentMethods?: boolean;
	constructor(protected handler: CommandHandler) {}
	chatInput?(replies: ChatInputReplies, args: ChatInputArgs): any;
	autocomplete?(replies: AutocompleteReplies, args: AutocompleteArgs): any;
	component?(replies: ComponentReplies, args: ComponentArgs): any;
	modal?(replies: ModalReplies, args: ModalArgs): any;
	user?(replies: UserReplies, args: UserArgs): any;
	message?(replies: MessageReplies, args: MessageArgs): any;
}
