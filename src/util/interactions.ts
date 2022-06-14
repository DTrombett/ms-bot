import type {
	AutocompleteInteraction,
	CommandInteraction,
	CommandInteractionOption,
} from "discord.js";

/**
 * Get the command string from an interaction.
 * @param interaction - The interaction to stringify
 */
export const interactionCommand = (
	interaction: AutocompleteInteraction | CommandInteraction
) => {
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
