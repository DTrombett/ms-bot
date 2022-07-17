const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

/**
 * Formats a number of bytes into a human readable string.
 * @param bytes - The number of bytes to format
 * @param k - The constant to multiply the number by
 * @param space - Whether to add a space between the number and the unit
 * @returns The formatted bytes
 */
export const formatBytes = (bytes: number, k = 1024, space = true) => {
	if (bytes === 0) return "0 Bytes";
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Math.round(bytes / Math.pow(k, i))}${space ? " " : ""}${sizes[i]}`;
};

export default formatBytes;
