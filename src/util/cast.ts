/**
 * Cast a value to a type.
 * @param _value The value to cast
 * @template T The type to cast to
 */
export function cast<T>(_value: unknown): asserts _value is T {
	// noop
}

export default cast;
