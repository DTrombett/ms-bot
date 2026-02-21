export const escapeList = (text: string) =>
	text.replace(/^(\s*)([-*+])(?=\s)/gm, "$1\\$2");

export const escapeMarkdown = (text: string) =>
	text.replace(/[\\`*_[\]()#+\-.|>~:]/g, "\\$&");

export const escapeBaseMarkdown = (text: string) =>
	text.replace(/[`*_]/g, "\\$&");
