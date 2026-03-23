CREATE TABLE Users (
	id TEXT PRIMARY KEY,
	dayPoints INTEGER,
	match TEXT,
	remindMinutes INTEGER,
	reminded INTEGER DEFAULT 0,
	matchPointsHistory TEXT
);
CREATE TABLE SupercellPlayers (
	tag TEXT NOT NULL,
	type INTEGER NOT NULL,
	userId TEXT NOT NULL,
	notifications INTEGER DEFAULT 0,
	data TEXT,
	active BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY (tag, type)
);
CREATE TABLE Predictions (
	matchId TEXT NOT NULL,
	userId TEXT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
	prediction TEXT NOT NULL,
	PRIMARY KEY (userId, matchId)
);
CREATE TABLE Reminders (
	id TEXT NOT NULL,
	date TEXT NOT NULL,
	userId TEXT NOT NULL,
	remind TEXT NOT NULL,
	PRIMARY KEY (id, userId)
);
CREATE TABLE Tournaments (
	name TEXT PRIMARY KEY,
	logChannel TEXT NOT NULL,
	game INTEGER NOT NULL,
	team INTEGER DEFAULT 1,
	registrationMode INTEGER DEFAULT 0,
	minPlayers INTEGER,
	registrationMessageLink TEXT,
	registrationChannel TEXT,
	registrationRole TEXT,
	registrationStart INTEGER,
	registrationEnd INTEGER,
	requireTag BOOLEAN DEFAULT TRUE,
	bracketsTime INTEGER,
	publicBrackets BOOLEAN DEFAULT TRUE,
	channelsTime INTEGER,
	roundType INTEGER,
	autoMatch BOOLEAN DEFAULT TRUE,
	autoDeleteChannels BOOLEAN DEFAULT FALSE,
	channelName TEXT,
	endedChannelName TEXT,
	categoryId TEXT,
	endedCategoryId TEXT,
	matchMessageLink TEXT,
	rounds TEXT NOT NULL
)