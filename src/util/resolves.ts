/**
 * Returns true if the promise resolves, false otherwise.
 * The resulting promise won't be rejected.
 * @param promise - The promise to check
 * @returns A promise resolving returning whether the promise was resolved
 */
export const resolves = (promise: Promise<unknown>) => promise.then(() => true).catch(() => false);
