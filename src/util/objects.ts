export const toSearchParams = (o: object) =>
	new URLSearchParams(
		Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)),
	);

export const pick = <T, K extends keyof T>(o: T, ...keys: K[]) =>
	Object.fromEntries(keys.map((k) => [k, o[k]])) as Pick<T, K>;
