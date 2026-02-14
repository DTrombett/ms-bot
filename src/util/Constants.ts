export const Emojis = {
	kick: "994260465402253442",
	bann: "994261301364801537",
	location: "1007330533954551929",
};

export enum MatchStatus {
	ToBePlayed = "Upcoming",
	Live = "Live",
	Finished = "Finished",
	Postponed = "Postponed",
	// TODO: Handle canceled and abandoned matches
	Cancelled = "Canceled",
	Abandoned = "Abandoned",
}
