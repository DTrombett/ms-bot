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
	name TEXT NOT NULL,
	flags INTEGER NOT NULL,
	game INTEGER NOT NULL,
	logChannel TEXT NOT NULL,
	registrationMode INTEGER DEFAULT 0,
	rounds TEXT NOT NULL,
	team INTEGER DEFAULT 1,
	bracketsTime INTEGER,
	categoryId TEXT,
	channelName TEXT,
	channelsTime INTEGER,
	endedCategoryId TEXT,
	endedChannelName TEXT,
	matchMessageLink TEXT,
	minPlayers INTEGER,
	registrationChannel TEXT,
	registrationEnd INTEGER,
	registrationMessageLink TEXT,
	registrationRole TEXT,
	registrationStart INTEGER,
	roundType INTEGER,
	workflowId INTEGER,
	id INTEGER PRIMARY KEY AUTOINCREMENT
)