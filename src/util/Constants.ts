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
	"Prestigio" = 1 << 1,
	"Nuovo Brawler" = 1 << 2,
	"Avanzamento nel cammino dei trofei" = 1 << 3,
}
export enum ClashNotifications {
	"All" = 1 << 0,
	"Nuova arena raggiunta" = 1 << 1,
	"Nuova carta trovata" = 1 << 2,
	"Evoluzione sbloccata" = 1 << 3,
	"Nuova lega raggiunta" = 1 << 4,
}

export enum RegistrationMode {
	Discord = 1 << 0,
	Dashboard = 1 << 1,
}
export enum TournamentFlags {
	TagRequired = 1 << 0,
	PublicBrackets = 1 << 1,
	AutoDetectResults = 1 << 2,
	AutoDeleteChannels = 1 << 3,
}
export enum TournamentStatusFlags {
	BracketsCreated = 1 << 0,
	Finished = 1 << 1,
}
export enum DBMatchStatus {
	ToBePlayed,
	Playing,
	Finished,
	Default,
	Abandoned,
	Postponed,
}
export enum TournamentRoundMode {
	Manual = 1,
	Once,
	Fast,
}
