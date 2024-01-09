const getDate = () => `[${new Date().toISOString()}]`;

export const log = (...args: unknown[]) => {
	console.log(getDate(), ...args);
};
export const info = (...args: unknown[]) => {
	console.info("\x1b[2m", getDate(), ...args, "\x1b[0m");
};
export const error = (...args: unknown[]) => {
	console.error("\x1b[31m", getDate(), ...args, "\x1b[0m");
};
export const warn = (...args: unknown[]) => {
	console.warn("\x1b[33m", getDate(), ...args, "\x1b[0m");
};
