import CustomClient from "./CustomClient";

/**
 * Normalize a promise rejection to a plain error object.
 * @param err - The error to normalize
 * @returns An Error object
 */
export const normalizeError = (err: unknown) => {
	CustomClient.printToStderr(err);
	return err instanceof Error
		? err
		: new Error(typeof err === "string" ? err : "Unknown error");
};

export default normalizeError;
