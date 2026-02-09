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

export const timeout = (msDelay?: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, msDelay);
	});
