export const allSettled: {
	<T extends readonly unknown[] | []>(
		values: T,
	): Promise<{
		-readonly [P in keyof T]: Awaited<Exclude<T[P], Falsy>> | undefined;
	}>;
	<T>(
		values: Iterable<T | PromiseLike<T>>,
	): Promise<(Awaited<Exclude<T, Falsy>> | undefined)[]>;
} = async (values: Iterable<unknown>) =>
	(
		await Promise.allSettled(Array.from(values, (v): unknown => v || undefined))
	).map((r) => (r.status === "fulfilled" ? r.value : undefined));
