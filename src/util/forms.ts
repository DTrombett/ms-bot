import { Temporal } from "temporal-polyfill";

/* eslint-disable no-sparse-arrays */
export enum ParseType {
	Text,
	Number,
	Date,
	DateTime,
	Time,
	Boolean,
}

const parsers: (((v: string) => any) | undefined)[] = [
	(v) => v,
	(v) => +v,
	(v) =>
		Temporal.PlainDateTime.from(v).toZonedDateTime("Europe/Rome")
			.epochMilliseconds / 1000,
	,
	,
	(v) => v === "on",
];
parsers[ParseType.DateTime] = parsers[ParseType.Date];

export const parseForm = <T extends Record<string, ParseType>>(
	form: FormData,
	parseMap: T,
) =>
	Object.fromEntries(
		Object.entries(parseMap).map(([k, v]) => {
			const value = form.get(k);

			return [
				k,
				value == null || value === "" ? null
				: typeof value === "string" ? parsers[v]?.(value)
				: value,
			];
		}),
	) as {
		[K in keyof T]:
			| (T[K] extends ParseType.Boolean ? boolean
			  : T[K] extends ParseType.Date | ParseType.DateTime | ParseType.Number ?
					number
			  : T[K] extends ParseType.Text ? string
			  : never)
			| null;
	};
