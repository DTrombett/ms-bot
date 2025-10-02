export const formatTime = (ms: number): string => {
	const sign = ms >= 0 ? "" : "-";
	const hours = Math.floor((ms = Math.abs(ms)) / 3_600_000);
	const last = `${Math.floor((ms % 3_600_000) / 60_000)
		.toString()
		.padStart(2, "0")}:${Math.floor((ms % 60_000) / 1_000)
		.toString()
		.padStart(2, "0")}.${(ms % 1000).toString().padStart(3, "0")}`;

	return `${sign}${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}${last}`;
};

export const idDiff = (id1: string, id2: string): number =>
	Number((BigInt(id1) >> 22n) - (BigInt(id2) >> 22n));

export const idToTimestamp = (id: string): number =>
	Number((BigInt(id) >> 22n) + 1420070400000n);

export const parseTime = (str: string): number => {
	str = str.trim().toLowerCase();
	const date = new Date();
	const now = date.getTime();
	let match = str.match(
		/^(?:(?<day>\d{1,2})\/(?<month>\d{1,2})(?:\/(?<year>\d{2}|\d{4}))?)?\s*,?\s*(?:(?<hours>\d{1,2}):(?<minutes>\d{1,2})(?::(?<seconds>\d{1,2}))?)?$/,
	);

	if (match?.groups) {
		const year = Number(match.groups.year);

		date.setFullYear(
			(year >= 1000 ? year : year + 2000) || date.getFullYear(),
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
	match = str.match(
		/^(?:(?<months>\d+)\s*(?:mos?|mesi|mese|months?))?\s*,?\s*e?\s*(?:(?<weeks>\d+)\s*(?:ws?|settimana|settimane|weeks?))?\s*,?\s*e?\s*(?:(?<days>\d+)\s*(?:ds?|giorni|giorno|days?|gg?))?\s*,?\s*e?\s*(?:(?<hours>\d+)\s*(?:hs?|ore|hours?|ore|ora|hrs?))?\s*,?\s*e?\s*(?:(?<minutes>\d+)\s*(?:mins?|minuti|minuto|minutes?|m))?\s*,?\s*e?\s*(?:(?<seconds>\d+)\s*(?:secs?|secondi|secondo|ss?|seconds?))?$/,
	);
	if (match?.groups) {
		date.setMonth(
			date.getMonth() + (Number(match.groups.months) || 0),
			date.getDate() +
				(Number(match.groups.days) || 0) +
				(Number(match.groups.weeks) || 0) * 7,
		);
		date.setHours(
			date.getHours() + (Number(match.groups.hours) || 0),
			date.getMinutes() + (Number(match.groups.minutes) || 0),
			date.getSeconds() + (Number(match.groups.seconds) || 0),
			0,
		);
		return date.getTime() - now;
	}
	return 0;
};
