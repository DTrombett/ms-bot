export const toSearchParams = (o: object) => {
	const urlSearchParams = new URLSearchParams();

	for (const name in o) {
		const value = Reflect.get(o, name);

		if (value != null) urlSearchParams.set(name, String(value));
	}
	return urlSearchParams;
};
