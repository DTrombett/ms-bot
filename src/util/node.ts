export const ok: (value: any, message?: string | Error) => asserts value = (
	value,
	message,
) => {
	if (!value)
		throw message instanceof Error ? message : (
				new Error(message ?? `Expected value to be truthy, but got ${value}`)
			);
};

export const equal: <T>(
	actual: any,
	expected: T,
	message?: string | Error,
) => asserts actual is T = (actual, expected, message) => {
	if (actual !== expected)
		throw message instanceof Error ? message : (
				new Error(
					message ??
						`Expected ${actual} and ${expected as any} to be strictly equal`,
				)
			);
};

export const match = (
	value: string,
	regExp: RegExp,
	message?: string | Error,
): void => {
	if (typeof value !== "string")
		throw new TypeError('The "string" argument must be of type string.');
	if (!regExp.test(value))
		throw message instanceof Error ? message : (
				new Error(
					message ??
						`The input did not match the regular expression ${regExp}. Input:\n\n'${value}'\n`,
				)
			);
};

export const timeout = (msDelay?: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, msDelay);
	});
