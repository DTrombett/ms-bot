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

export enum SupercellPlayerType {
	BrawlStars,
	ClashRoyale,
}

export enum BrawlNotifications {
	"All" = 1 << 0,
	"Prestige" = 1 << 1,
	"New Brawler" = 1 << 2,
	"Trophy Road Advancement" = 1 << 3,
}
export enum ClashNotifications {
	"All" = 1 << 0,
	"New Arena" = 1 << 1,
	"New Card" = 1 << 2,
	"New Evo" = 1 << 3,
	"New League" = 1 << 4,
}
