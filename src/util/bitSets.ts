export const bitSetMap = <T>(
	bits: number,
	...funcs: ((bit: boolean) => T)[]
): T[] => funcs.map((fn, i) => fn((bits & (1 << i)) !== 0));
