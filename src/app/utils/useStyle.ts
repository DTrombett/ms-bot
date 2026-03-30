export default (path: string): void => {
	const set: Set<string> = Reflect.get(globalThis, "styles");

	set.add(path);
};
