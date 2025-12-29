export const hashMatches = (matches: Match[]) => {
	const str = JSON.stringify(
		matches
			.toSorted((a, b) => a.matchId.localeCompare(b.matchId))
			.map((m) => [
				m.matchId,
				m.providerStatus,
				m.providerHomeScore,
				m.providerAwayScore,
			]),
	);
	let h = 0x811c9dc5;

	for (let i = 0; i < str.length; i++)
		h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
	return (h >>> 0).toString(36);
};
