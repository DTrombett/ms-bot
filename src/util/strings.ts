export const maxLength = (str: string, max: number) =>
	str.length > max ? str.slice(0, max - 3).trimEnd() + "..." : str;
