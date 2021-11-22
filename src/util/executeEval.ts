import { inspect } from "node:util";

/**
 * Execute some code and return the result.
 * @param code - The code to execute
 * @returns The result of the code
 */
export const executeEval = async (code: string): Promise<string> => {
	let result;

	try {
		result = (await eval(code)) as unknown;
	} catch (e) {
		result = e;
	}
	switch (typeof result) {
		case "string":
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
};
