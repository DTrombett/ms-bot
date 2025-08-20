import type { MatchDay } from "./types";

export const getMatchDayNumber = (matchDay: MatchDay) =>
	Number(matchDay.title.split(" ")[1]);
