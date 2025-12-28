export const getMatchDayNumber = (matchDay: MatchDay) =>
	Number(matchDay.providerId.split(":")[2]);
