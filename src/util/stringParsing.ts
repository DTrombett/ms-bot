import { equal, ok } from "./node.ts";

type ParseResult<T> = {
	result: T;
	context: Record<string, unknown>;
	string: string;
};

const WhiteSpace = /^[\p{General_Category=Space_Separator}\t\v\f\ufeff]+/u;
const LineTerminator = /^(?:\n\r|[\n\r\u2028\u2029])/u;
const ReservedWord =
	/^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|function|if|import|in|instanceof|new|return|switch|throw|try|typeof|var|void|while|with|yield)$/u;
const IdentifierStart = /^[\p{ID_Start}$_]/u;
const IdentifierPart = /^[\p{ID_Continue}$]/u;
const DoubleStringCharacters = new RegExp(
	`^(?:[^"\\n\\r]|\\\\"|\\\\${LineTerminator.source.slice(1)})`,
	"u",
);
const SingleStringCharacters = new RegExp(
	`^(?:[^'\\n\\r]|\\\\'|\\\\${LineTerminator.source.slice(1)})`,
	"u",
);
const StringLiteral = new RegExp(
	`^(?:"${DoubleStringCharacters.source.slice(1)}*"|'${SingleStringCharacters.source.slice(1)}*')`,
);
const IdentifierName = new RegExp(
	`${IdentifierStart.source}${IdentifierPart.source.slice(1)}*`,
	"u",
);

const parseObject = (
	string: string,
	context: Record<string, unknown>,
): ParseResult<object> => {
	equal(string[0], "{");
	const original = string;
	let match: (string[] & { 0: string }) | null = null;
	const skip = (spaces = true, terminators = true) => {
		while (
			(match =
				(spaces && string.match(WhiteSpace)) ||
				(terminators && string.match(LineTerminator)) ||
				null)
		)
			string = string.slice(match[0].length);
	};
	const advance = (spaces = true, terminators = true) => {
		ok(
			match,
			new SyntaxError("Invalid or unexpected token", {
				cause: { string, original },
			}),
		);
		string = string.slice(match[0].length);
		match = null;
		skip(spaces, terminators);
	};
	const result: Record<string | number | symbol, unknown> = {};

	for (
		string = string.slice(1), skip();
		string[0] && string[0] !== "}";
		advance()
	) {
		let key: unknown;

		if (
			(match = string.match(IdentifierName)) &&
			(!ReservedWord.test(match[0]) || (match = null))
		) {
			[key] = match;
			advance();
			if (string[0] === "," || string[0] === "}") {
				ok(
					typeof key === "string" && key in context,
					new ReferenceError(`${key as any} is not defined`, {
						cause: { string, original },
					}),
				);
				result[key] = context[key];
				if (string[0] === "}") break;
				match = [string[0]];
				continue;
			}
		} else if ((match = string.match(StringLiteral))) {
			key = JSON.parse(match[0]);
			advance();
		} else if (string[0] === "[") {
			match = [string[0]];
			advance();
			({ string, context, result: key } = parseExpression(string, context));
			skip();
			match = string[0] === "]" ? [string[0]] : null;
			advance();
		} else continue;
		equal(
			(match = [string[0]!])[0],
			":",
			new SyntaxError("Invalid or unexpected token", {
				cause: { string, original },
			}),
		);
		advance();
		({
			string,
			context,
			result: result[typeof key === "symbol" ? key : String(key)],
		} = parseExpression(string, context));
		skip();
		if (string[0] === "}") break;
		match = string[0] === "," ? [string[0]] : null;
	}
	equal(
		string[0],
		"}",
		new SyntaxError("Unexpected end of input", { cause: { string, original } }),
	);
	return { result, context, string: string.slice(1) };
};
const parseArray = (
	string: string,
	context: Record<string, unknown>,
): ParseResult<unknown[]> => {
	equal(string[0], "[");
	const original = string;
	let match: (string[] & { 0: string }) | null = null;
	const skip = (spaces = true, terminators = true) => {
		while (
			(match =
				(spaces && string.match(WhiteSpace)) ||
				(terminators && string.match(LineTerminator)) ||
				null)
		)
			string = string.slice(match[0].length);
	};
	const advance = (spaces = true, terminators = true) => {
		ok(
			match,
			new SyntaxError("Invalid or unexpected token", {
				cause: { string, original },
			}),
		);
		string = string.slice(match[0].length);
		match = null;
		skip(spaces, terminators);
	};
	const result: unknown[] = [];

	for (
		string = string.slice(1), skip();
		string[0] && string[0] !== "]";
		advance()
	) {
		if (string[0] === ",") {
			match = [string[0]];
			result.length++;
			continue;
		}
		({
			string,
			context,
			result: result[result.length],
		} = parseExpression(string, context));
		skip();
		if (string[0] === "]") break;
		match = string[0] === "," ? [string[0]] : null;
	}
	equal(
		string[0],
		"]",
		new SyntaxError("Unexpected end of input", { cause: { string, original } }),
	);
	return { result, context, string: string.slice(1) };
};
const parseExpression = (
	string: string,
	context: Record<string, unknown>,
): ParseResult<unknown> => {
	if (string[0] === "{") return parseObject(string, context);
	if (string[0] === "[") return parseArray(string, context);
	let match;

	if (
		(match = string.match(IdentifierName)) &&
		(!ReservedWord.test(match[0]) || (match = null))
	)
		if (match[0] in context)
			return {
				result: context[match[0]],
				context,
				string: string.slice(match[0].length),
			};
		else
			throw new ReferenceError(`${match[0]} is not defined`, {
				cause: { string, identifier: match[0] },
			});
	else if (
		(match = string.match(StringLiteral) ?? string.match(/^[-+]?[.\d]+/))
	)
		return {
			result: JSON.parse(match[0]),
			context,
			string: string.slice(match[0].length),
		};
	throw new SyntaxError("Invalid or unexpected token", { cause: string });
};

export const findJSObjectAround = <T>(
	string: string,
	index: number,
	level = 1,
	context = { true: true, false: false, null: null },
) => {
	let bracketIndex = index;

	for (; level > 0 && bracketIndex >= 0; level--)
		bracketIndex = string.lastIndexOf("{", bracketIndex);
	ok(level === 0 && bracketIndex >= 0, "Couldn't find opening brackets");
	return parseObject(string.slice(bracketIndex), context).result as T;
};
export const findJSONObjectAround = <T>(
	string: string,
	index: number,
	level = 1,
) => {
	for (; level > 0; level--) index = string.lastIndexOf("{", index);
	equal(level, 0, "Couldn't find opening brackets");
	string = string.slice(index);
	let inString = false,
		escape = false;

	for (index = 0; index < string.length; index++)
		if (inString) {
			if (escape) escape = false;
			else if (string[index] === "\\") escape = true;
			else if (string[index] === '"') inString = false;
		} else if (string[index] === '"') inString = true;
		else if (string[index] === "{" || string[index] === "[") level++;
		else if (string[index] === "}" || string[index] === "]") {
			level--;
			if (level === 0) return JSON.parse(string.slice(0, index + 1)) as T;
		}
	throw new Error("No complete JSON value found");
};
