import type { CommandInteractionOption } from "discord.js";
import { AutocompleteInteraction, CommandInteraction } from "discord.js";

/**
 * Get the command string from an interaction.
 * @param interaction - The interaction to stringify
 */
export const interactionCommand = (
	interaction: AutocompleteInteraction | CommandInteraction
) => {
	if (
		!(interaction instanceof AutocompleteInteraction) &&
		!(interaction instanceof CommandInteraction)
	)
		throw new TypeError(
			`Argument 'interaction' must be an instance of AutocompleteInteraction or CommandInteraction`
		);
	let result = `/${interaction.commandName}`;
	const resolveOption = (option: CommandInteractionOption) => {
		result += ` ${option.name}`;
		if (option.value !== undefined)
			try {
				result += `:${option.value.toLocaleString()}`;
			} catch (error) {
				result += `:${option.value.toString()}`;
			}
		if (option.options) option.options.forEach(resolveOption);
	};

	interaction.options.data.forEach(resolveOption);
	return result as `/${string}`;
};
