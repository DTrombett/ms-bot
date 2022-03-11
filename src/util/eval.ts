import CustomClient from "./CustomClient";

/**
 * Execute some code and return the result.
 * @param code - The code to execute
 * @returns The result of the code
 */
export async function runEval(code: string): Promise<unknown> {
	try {
		// eslint-disable-next-line no-useless-call
		return (await eval.call(null, code)) as unknown;
	} catch (e) {
		return e;
	}
}

/**
 * Execute some code and return the parsed result.
 * @param code - The code to execute
 * @returns The result of the code
 */
export const parseEval = async (code: string): Promise<string> =>
	CustomClient.inspect(await runEval(code));
