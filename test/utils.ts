import { ok } from "node:assert/strict";
import { inspect } from "node:util";

const keyInObject: <T extends string>(
	key: T,
	object: object,
	message: string | undefined,
) => asserts object is Record<T, unknown> = (key, object, message) => {
	ok(key in object, message);
};
const isOk = (
	object: unknown,
	expected: unknown,
	message: string | undefined,
	ignoreAdditionalProperties: boolean | undefined,
) => {
	if (object === expected) return true;
	if (typeof object !== "object" || object === null) return false;
	if (Array.isArray(expected) && expected.length === 1) {
		ok(Array.isArray(object));
		compareObjects(object[0], expected[0], message, ignoreAdditionalProperties);
		return true;
	}
	if (
		"toJSON" in object &&
		typeof object.toJSON === "function" &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		isOk(object.toJSON(), expected, message, ignoreAdditionalProperties)
	)
		return true;
	if (!expected || typeof expected !== "object") return false;
	const keys = Object.keys(expected);

	if (!ignoreAdditionalProperties) {
		const objectLength = Object.keys(object).filter((k) => {
			keyInObject(k, object, message);
			return object[k] !== undefined;
		}).length;

		ok(
			keys.length === objectLength,
			`${message}\nDifferent keys length. Expected ${keys.length}, received: ${objectLength}`,
		);
	}
	for (const key of keys) {
		keyInObject(key, expected, message);
		keyInObject(key, object, message);
		compareObjects(
			object[key],
			expected[key],
			message,
			ignoreAdditionalProperties,
		);
	}
	return true;
};

export const compareObjects = (
	object: unknown,
	expected: unknown,
	message = "",
	ignoreAdditionalProperties = false,
) => {
	message += `\nExpected: ${inspect(expected, { colors: true })}\nReceived: ${inspect(object, { colors: true })}`;
	ok(isOk(object, expected, message, ignoreAdditionalProperties), message);
};
