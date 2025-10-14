import {
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { CommandHandler } from "./util/CommandHandler.ts";

export class Command {
	static readonly chatInputData?: RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody>;
	static readonly contextMenuData?: RecursiveReadonly<
		RESTPostAPIContextMenuApplicationCommandsJSONBody[]
	>;
	static readonly customId?: string;
	static readonly private?: boolean;
	readonly supportComponentMethods?: boolean;
	constructor(protected handler: CommandHandler) {}
	chatInput?(replies: ChatInputReplies, args: ChatInputArgs): any;
	autocomplete?(replies: AutoCompleteReplies, args: AutoCompleteArgs): any;
	component?(replies: ComponentReplies, args: ComponentArgs): any;
	modal?(replies: ModalReplies, args: ModalArgs): any;
	user?(replies: UserReplies, args: UserArgs): any;
	message?(replies: MessageReplies, args: MessageArgs): any;
}

export default Command;
