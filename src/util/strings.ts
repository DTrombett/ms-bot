export const maxLength = (str: string, max: number) =>
	str.length > max ? str.slice(0, max - 3).trimEnd() + "..." : str;

export const hexToUint8Array = (hex: string) =>
	new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

export const multiline = (strings: TemplateStringsArray, ...values: any[]) => {
	let result = "";

	for (let i = 0; i < strings.length; i++) {
		result += strings[i]?.replace(/\n\s+/g, "\n");
		if (i < values.length) result += values[i];
	}
	return result;
};
