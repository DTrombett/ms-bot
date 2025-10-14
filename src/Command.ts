import {
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";

export abstract class Command {
	static readonly chatInputData?: RecursiveReadonly<RESTPostAPIChatInputApplicationCommandsJSONBody>;
	static readonly contextMenuData?: RecursiveReadonly<
		RESTPostAPIContextMenuApplicationCommandsJSONBody[]
	>;
	static readonly customId?: string;
	static readonly private?: boolean;
	static readonly supportComponentMethods?: boolean;
	static chatInput?(replies: ChatInputReplies, args: ChatInputArgs): any;
	static autocomplete?(
		replies: AutoCompleteReplies,
		args: AutoCompleteArgs,
	): any;
	static component?(replies: ComponentReplies, args: ComponentArgs): any;
	static modal?(replies: ModalReplies, args: ModalArgs): any;
	static user?(replies: UserReplies, args: UserArgs): any;
	static message?(replies: MessageReplies, args: MessageArgs): any;
}

export default Command;
