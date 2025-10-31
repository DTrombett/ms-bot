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

	return `${sign}${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}${last}`;
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

export const idDiff = (id1: string, id2: string): number =>
	Number((BigInt(id1) >> 22n) - (BigInt(id2) >> 22n));

export const idToTimestamp = (id: string): number =>
	Number((BigInt(id) >> 22n) + 1420070400000n);

const parseNumber = (string?: string) => Number(string) || 0;

export const parseTime = (str: string): number => {
	str = str.trim().toLowerCase();
	let match = str.match(
		/^(?:(?<months>\d+)\s*(?:mos?|mesi|mese|months?))?\s*,?\s*e?\s*(?:(?<weeks>\d+)\s*(?:ws?|settimana|settimane|weeks?))?\s*,?\s*e?\s*(?:(?<days>\d+)\s*(?:ds?|giorni|giorno|days?|gg?))?\s*,?\s*e?\s*(?:(?<hours>\d+)\s*(?:hs?|ore|hours?|ore|ora|hrs?))?\s*,?\s*e?\s*(?:(?<minutes>\d+)\s*(?:mins?|minuti|minuto|minutes?|m))?\s*,?\s*e?\s*(?:(?<seconds>\d+)\s*(?:secs?|secondi|secondo|ss?|seconds?))?$/,
	);

	if (match?.groups)
		return (
			parseNumber(match.groups.months) * TimeUnit.Month +
			parseNumber(match.groups.weeks) * TimeUnit.Week +
			parseNumber(match.groups.days) * TimeUnit.Day +
			parseNumber(match.groups.hours) * TimeUnit.Hour +
			parseNumber(match.groups.minutes) * TimeUnit.Minute +
			parseNumber(match.groups.seconds) * TimeUnit.Second
		);
	match = str.match(
		/^(?:(?<day>\d{1,2})\/(?<month>\d{1,2})(?:\/(?<year>\d{2}|\d{4}))?)?\s*,?\s*(?:(?<hours>\d{1,2}):(?<minutes>\d{1,2})(?::(?<seconds>\d{1,2}))?)?$/,
	);
	if (match?.groups) {
		const date = new Date();
		const now = date.getTime();
		let year = parseNumber(match.groups.year);

		if (year > 0 && year < 1000) year += 2000;
		date.setFullYear(
			year || date.getFullYear(),
			Number(match.groups.month) - 1 || date.getMonth(),
			Number(match.groups.day) || date.getDate(),
		);
		date.setHours(
			Number(match.groups.hours) || 0,
			Number(match.groups.minutes) || 0,
			Number(match.groups.seconds) || 0,
			0,
		);
		if (date.getTime() < now) date.setDate(date.getDate() + 1);
		return date.getTime() - now;
	}
	return 0;
};
