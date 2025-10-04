import type {
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Command } from "./types";

/** This function has the purpose to automatically infer A and B generics for the command */
export const createCommand = <
	A extends RESTPostAPIChatInputApplicationCommandsJSONBody,
	B extends RESTPostAPIContextMenuApplicationCommandsJSONBody[],
>(
	options: Command<A, B>,
) => options;
