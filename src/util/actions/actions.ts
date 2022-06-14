import type { Actions } from "../types";

/**
 * Create an action id.
 * @param action - The action to do
 * @param args - The arguments to pass to the action
 * @returns The id of the action
 */
export const createActionId = <T extends keyof Actions>(
	action: T,
	...args: Actions[T]
) => `${action}${args.length ? `-${args.join("-")}` : ""}`;

/**
 * Parse an action id.
 * @param id - The id to parse
 * @returns The action and arguments of the action
 */
export const parseActionId: {
	<T extends keyof Actions>(id: string): T extends keyof Actions
		? {
				action: T;
				args: Actions[T];
		  }
		: never;
	<_ extends keyof Actions>(button: string): {
		action: string;
		args: string[];
	};
} = (id) => {
	const args = id.split("-");

	return {
		action: args[0],
		args: args.slice(1),
	};
};
