export const hashMatches = async (matches: Match[]) =>
	// TODO: Use Uint8Array.toHex() when it becomes available in workers
	Array.from(
		new Uint8Array(
			await crypto.subtle.digest(
				"SHA-128",
				new TextEncoder().encode(
					JSON.stringify(
						matches
							.sort((a, b) => a.matchId.localeCompare(b.matchId))
							.map((m) => [
								m.matchId,
								m.providerStatus,
								m.providerHomeScore,
								m.providerAwayScore,
							]),
					),
				),
			),
		),
	)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
