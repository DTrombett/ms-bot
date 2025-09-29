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
