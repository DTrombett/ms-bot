export const getLevel = (i: number) => Math.floor(Math.log2(i + 1));
export const getElementsCount = (level: number) => 1 << level;
export const getFirstIndex = (level: number) => (1 << level) - 1;
export const getLastIndex = (level: number) => getFirstIndex(level + 1) - 1;
export const getOffset = (i: number, level = getLevel(i)) =>
	i - getFirstIndex(level);
export const getParent = (i: number) => Math.floor((i - 1) / 2);
export const getLeftChild = (i: number) => 2 * i + 1;
export const getRightChild = (i: number) => getLeftChild(i) + 1;
export const getLevelsCount = (length: number) =>
	Math.ceil(Math.log2(length + 1));
export const getLastLevel = (length: number) => getLevelsCount(length) - 1;
