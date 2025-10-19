export const noop = () => {};
export const passThrough = <T>(v: T) => v;
export const constant =
	<T>(v: T) =>
	() =>
		v;
