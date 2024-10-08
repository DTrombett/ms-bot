/**
 * Normalize a promise rejection to a plain error object.
 * @param err - The error to normalize
 * @returns An Error object
 */
export const normalizeError = (err: unknown) => {
	console.error(err);
	return err instanceof Error
		? err
		: new Error(typeof err === "string" ? err : "Unknown error");
};

export default normalizeError;
