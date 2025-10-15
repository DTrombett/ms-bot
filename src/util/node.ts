export const ok: (value: any, message?: string) => asserts value = (
	value,
	message,
) => {
	if (!value)
		throw new Error(message ?? `Expected value to be truthy, but got ${value}`);
};

export const timeout = (msDelay?: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, msDelay);
	});
