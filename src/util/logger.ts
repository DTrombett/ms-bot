import { stderr, stdout } from "node:process";
import { inspect as nodeInspect } from "node:util";
import color, { Colors } from "./colors";

/**
 * Inspects a value.
 * @param value - The value to check
 */
export const inspect = (value: unknown) => {
	switch (typeof value) {
		case "string":
			return value;
		case "function":
			return value.toString();
		default:
			return nodeInspect(value, { colors: true });
	}
};

/**
 * Prints a message to stdout.
 * @param message - The string to print
 */
export const printToStdout = (message: unknown) => {
	stdout.write(`${inspect(message)}\n`);
};

/**
 * Prints a message to stderr.
 * @param message - The string to print
 */
export const printToStderr = (message: unknown) => {
	stderr.write(color(`${inspect(message)}\n`, Colors.FgRed));
};
