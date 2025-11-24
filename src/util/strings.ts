export const maxLength = (str: string, max: number) =>
	str.length > max ? str.slice(0, max - 3).trimEnd() + "..." : str;

export const hexToUint8Array = (hex: string) =>
	new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

export const template = (strings: TemplateStringsArray, ...values: any[]) => {
	let result = "";
	const templateStringsArray = strings.slice();

	for (let i = 0; i < templateStringsArray.length; i++) {
		result += templateStringsArray[i]!.replace(/\n\s+/g, "\n");
		if (i < values.length)
			if (!result.endsWith("\n")) result += values[i];
			else if (!values[i]) {
				do i++;
				while (
					i < templateStringsArray.length &&
					!templateStringsArray[i]!.includes("\n")
				);
				templateStringsArray[i] = templateStringsArray[i]!.slice(
					templateStringsArray[i--]!.indexOf("\n"),
				);
				result = result.trimEnd();
			}
	}
	return result;
};
