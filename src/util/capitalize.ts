/**
 * Capitalize a string.
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default capitalize;
