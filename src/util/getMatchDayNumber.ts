import type { MatchDay } from "./types.ts";

export const getMatchDayNumber = (matchDay: MatchDay) =>
	Number(matchDay.title.split(" ")[1]);
