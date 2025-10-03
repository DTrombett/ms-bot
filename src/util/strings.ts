export const maxLength = (str: string, max: number) =>
	str.length > max ? str.slice(0, max - 3).trimEnd() + "..." : str;

export const hexToUint8Array = (hex: string) =>
	new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
