import { Temporal } from "temporal-polyfill";

export enum TimeUnit {
	Millisecond = 1,
	Second = Millisecond * 1000,
	Minute = Second * 60,
	Hour = Minute * 60,
	Day = Hour * 24,
	Week = Day * 7,
	Year = Day * 365.25,
	Month = Year / 12,
}
export const formatTime = (ms: number): string => {
	const sign = ms >= 0 ? "" : "-";
	const hours = Math.floor((ms = Math.abs(ms)) / TimeUnit.Hour);
	const last = `${Math.floor((ms % TimeUnit.Hour) / TimeUnit.Minute)
		.toString()
		.padStart(2, "0")}:${Math.floor((ms % TimeUnit.Minute) / TimeUnit.Second)
		.toString()
		.padStart(2, "0")}.${(ms % TimeUnit.Second).toString().padStart(3, "0")}`;

	return `${sign}${
		hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""
	}${last}`;
};

const formatTimeString = (
	n: number,
	singular: string,
	plural = singular,
): string => (n > 0 ? `${n} ${n === 1 ? singular : plural}` : "");
export const formatLongTime = (ms: number): string =>
	[
		formatTimeString(Math.floor(ms / TimeUnit.Year), "anno", "anni"),
		formatTimeString(
			Math.floor((ms % TimeUnit.Year) / TimeUnit.Month),
			"mese",
			"mesi",
		),
		formatTimeString(
			Math.floor((ms % TimeUnit.Month) / TimeUnit.Day),
			"giorno",
			"giorni",
		),
		formatTimeString(
			Math.floor((ms % TimeUnit.Day) / TimeUnit.Hour),
			"ora",
			"ore",
		),
		formatTimeString(
			Math.floor((ms % TimeUnit.Hour) / TimeUnit.Minute),
			"minuto",
			"minuti",
		),
		formatTimeString(
			Math.floor((ms % TimeUnit.Minute) / TimeUnit.Second),
			"secondo",
			"secondi",
		),
	]
		.filter(Boolean)
		.join(", ") || "0 secondi";
export const formatShortTime = (ms: number): string =>
	formatTimeString(Math.floor(ms / TimeUnit.Year), "anno", "anni") ||
	formatTimeString(Math.floor(ms / TimeUnit.Month), "mese", "mesi") ||
	formatTimeString(Math.floor(ms / TimeUnit.Day), "giorno", "giorni") ||
	formatTimeString(Math.floor(ms / TimeUnit.Hour), "ora", "ore") ||
	formatTimeString(Math.floor(ms / TimeUnit.Minute), "minuto", "minuti") ||
	formatTimeString(Math.floor(ms / TimeUnit.Second), "secondo", "secondi") ||
	"0 secondi";

export const idDiff = (id1: string, id2: string): number =>
	Number((BigInt(id1) >> 22n) - (BigInt(id2) >> 22n));

export const idToTimestamp = (id: string): number =>
	Number((BigInt(id) >> 22n) + 1420070400000n);

/**
 * Parses a time value string and converts it to a UNIX timestamp in milliseconds.
 * Automatically detects the format based on the value:
 * - Values that start with http: Treated as Discord URL with an ID as last path fragment
 * - Values < 10^10: Treated as UNIX timestamp in seconds, converted to milliseconds
 * - Values < 10^13: Treated as UNIX timestamp in milliseconds
 * - Larger values: Treated as Discord Snowflake IDs and converted to timestamps
 * @param value - The time value to parse (as a string)
 * @returns The timestamp in milliseconds, or NaN if the value is invalid or cannot be parsed
 */
export const parseTimeValue = (value: string): number => {
	if (value.startsWith("http"))
		value = value.match(/\/(\d+)(?:[?#]|$)/)?.[1] ?? value;
	const num = Number(value);

	if (Number.isNaN(num)) return NaN;
	if (Math.abs(num) < 1e10) return num * 1000;
	if (Math.abs(num) < 1e13) return num;
	try {
		return idToTimestamp(value);
	} catch {
		return NaN;
	}
};

const parseNumber = (string?: string) => Number(string) || 0;

export const parseDuration = (
	str: string,
	relativeTo = Temporal.Now.zonedDateTimeISO("Europe/Rome"),
): Temporal.ZonedDateTime | null => {
	try {
		str = str.trim().toLowerCase();
		let match = str.match(
			/^(?:(?<years>\d+)\s*(?:ys?|anni|anno|years?))?\s*,?\s*e?\s*(?:(?<months>\d+)\s*(?:mos?|mesi|mese|months?))?\s*,?\s*e?\s*(?:(?<weeks>\d+)\s*(?:ws?|settimana|settimane|weeks?))?\s*,?\s*e?\s*(?:(?<days>\d+)\s*(?:ds?|giorni|giorno|days?|gg?))?\s*,?\s*e?\s*(?:(?<hours>\d+)\s*(?:hs?|ore|hours?|ore|ora|hrs?))?\s*,?\s*e?\s*(?:(?<minutes>\d+)\s*(?:mins?|minuti|minuto|minutes?|m))?\s*,?\s*e?\s*(?:(?<seconds>\d+)\s*(?:secs?|secondi|secondo|ss?|seconds?))?$/,
		);

		if (match?.groups)
			return relativeTo.add({
				years: parseNumber(match.groups.years),
				months: parseNumber(match.groups.months),
				weeks: parseNumber(match.groups.weeks),
				days: parseNumber(match.groups.days),
				hours: parseNumber(match.groups.hours),
				minutes: parseNumber(match.groups.minutes),
				seconds: parseNumber(match.groups.seconds),
			});
		match = str.match(
			/^(?:(?<day>\d{1,2})[/-](?<month>\d{1,2})(?:[/-](?<year>\d{2}|\d{4}))?)?\s*,?\s*(?:(?<hour>\d{1,2}):(?<minute>\d{1,2})(?::(?<second>\d{1,2}))?)?$/,
		);
		if (match?.groups) {
			const target = Temporal.ZonedDateTime.from({
				timeZone: relativeTo,
				year:
					match.groups.year ?
						match.groups.year.length === 4 ?
							Number(match.groups.year)
						:	Number(match.groups.year) + 2000
					:	relativeTo.year,
				month:
					match.groups.month ? Number(match.groups.month) : relativeTo.month,
				day: match.groups.day ? Number(match.groups.day) : relativeTo.day,
				hour: match.groups.hour ? Number(match.groups.hour) : undefined,
				minute: match.groups.minute ? Number(match.groups.minute) : undefined,
				second: match.groups.second ? Number(match.groups.second) : undefined,
			});

			return (
					match.groups.day ||
						Temporal.ZonedDateTime.compare(target, relativeTo) > 0
				) ?
					target
				:	target.add({ days: 1 });
		}
	} catch (err) {
		console.error(err);
	}
	return null;
};
