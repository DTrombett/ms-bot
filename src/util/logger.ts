import { createWriteStream } from "node:fs";
import { stderr, stdout } from "node:process";
import { inspect as nodeInspect } from "node:util";
import color, { Colors } from "./colors";

const stream = createWriteStream("./.log", { flags: "a" });
const old = {
	stdout: stdout.write.bind(stdout),
	stderr: stderr.write.bind(stderr),
};

stream.write(`${"_".repeat(80)}\n\n`);
stdout.write = (...args) =>
	old.stdout(...(args as [string])) && stream.write(args[0]);
stderr.write = (...args) =>
	old.stderr(...(args as [string])) && stream.write(args[0]);

/**
 * Inspects a value.
 * @param value - The value to check
 */
export const inspect = (value: unknown) => {
	switch (typeof value) {
		case "string":
			return value;
		case "bigint":
		case "number":
		case "boolean":
		case "function":
		case "symbol":
			return value.toString();
		case "object":
			return nodeInspect(value);
		default:
			return "undefined";
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