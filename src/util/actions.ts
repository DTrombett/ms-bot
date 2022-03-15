import type { ButtonActions } from "./types";

/**
 * Create a button action id.
 * @param action - The action to do
 * @param args - The arguments to pass to the action
 * @returns The id of the action
 */
export const createActionButton = <T extends keyof ButtonActions>(
	action: T,
	...args: ButtonActions[T][1]
) => `${action}-${args.join("-")}`;

/**
 * Parse a button action id.
 * @param button - The button to parse
 * @returns The action and arguments of the button
 */
export const parseActionButton: {
	<T extends keyof ButtonActions>(button: string): T extends keyof ButtonActions
		? {
				action: T;
				args: ButtonActions[T][1];
		  }
		: never;
	<_ extends keyof ButtonActions>(button: string): {
		action: string;
		args: string[];
	};
} = (button) => {
	const args = button.split("-");

	return {
		action: args[0],
		args: args.slice(1),
	};
};
