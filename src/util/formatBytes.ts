const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

/**
 * Formats a number of bytes into a human readable string.
 * @param bytes - The number of bytes to format
 * @returns The formatted bytes
 */
export const formatBytes = (bytes: number, space = true) => {
	if (bytes === 0) return "0 Bytes";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));

	return `${Math.round(bytes / Math.pow(1024, i))}${space ? " " : ""}${
		sizes[i]
	}`;
};

export default formatBytes;
