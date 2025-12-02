export const bitSetMap = <T>(
	bits: number,
	...funcs: (((bit: boolean) => T) | null | undefined)[]
): NonNullable<T>[] =>
	funcs.map((fn, i) => fn?.((bits & (1 << i)) !== 0)).filter((v) => v != null);
