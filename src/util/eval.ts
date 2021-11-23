import { inspect } from "node:util";

/**
 * Execute some code and return the result.
 * @param code - The code to execute
 * @returns The result of the code
 */
export async function runEval(code: string): Promise<unknown> {
	try {
		return (await eval(code)) as unknown;
	} catch (e) {
		return e;
	}
}

/**
 * Execute some code and return the parsed result.
 * @param code - The code to execute
 * @param thisArg - The value of `this` in the code
 * @returns The result of the code
 */
export async function parseEval(
	code: string,
	thisArg?: unknown
): Promise<string> {
	let result;

	result = await runEval.bind(thisArg)(code);
	switch (typeof result) {
		case "string":
			result = `"${result.replaceAll("\n", "\\n").replaceAll("\r", "\\r")}"`;
			break;
		case "bigint":
		case "number":
		case "boolean":
		case "function":
		case "symbol":
			result = result.toString();
			break;
		case "object":
			result = inspect(result);
			break;
		default:
			result = "undefined";
	}

	return result;
}
