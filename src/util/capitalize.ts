/**
 * Capitalize a string.
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Capitalize a string forcing only the first character as uppercase.
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export const forceCapitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export default capitalize;
