export const toSearchParams = (o: object) =>
	new URLSearchParams(
		Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)),
	);
