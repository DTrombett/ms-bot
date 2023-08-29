import type { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import type { CommandOptions } from "./types";

/**
 * This utility function is just to infer automatically the command type from the data.
 * @param command - The command data
 * @returns The command data
 */
export const createCommand = <
	T extends ApplicationCommandType,
	O extends ApplicationCommandOptionType,
	N extends string = string,
>(
	command: CommandOptions<T, O, N>,
) => command;

export default createCommand;
