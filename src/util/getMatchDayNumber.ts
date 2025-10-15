export const getMatchDayNumber = (matchDay: MatchDay) =>
	Number(matchDay.title.split(" ")[1]);
