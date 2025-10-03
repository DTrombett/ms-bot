import type {
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Command } from "./types";

export const createCommand = <
	A extends RESTPostAPIChatInputApplicationCommandsJSONBody,
	B extends RESTPostAPIContextMenuApplicationCommandsJSONBody[],
>(
	options: Command<A, B>,
) => options;
