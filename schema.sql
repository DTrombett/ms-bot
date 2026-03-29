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
	name TEXT NOT NULL,
	notifications INTEGER DEFAULT 0,
	data TEXT,
	active BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY (tag, type),
	UNIQUE (tag, userId)
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
	registrationMode INTEGER NOT NULL DEFAULT 0,
	rounds TEXT NOT NULL,
	team INTEGER NOT NULL DEFAULT 1,
	bracketsTime INTEGER,
	categoryId TEXT,
	channelName TEXT,
	channelsTime INTEGER,
	endedCategoryId TEXT,
	endedChannelName TEXT,
	matchMessageLink TEXT,
	minPlayers INTEGER,
	registrationChannel TEXT,
	registrationChannelName TEXT,
	registrationEnd INTEGER,
	registrationTemplateLink TEXT,
	registrationRole TEXT,
	registrationStart INTEGER,
	registrationMessage TEXT,
	roundType INTEGER,
	workflowId TEXT,
	id INTEGER PRIMARY KEY AUTOINCREMENT
);
CREATE TABLE TournamentTeams (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE Participants (
	tournamentId INTEGER NOT NULL REFERENCES Tournaments(id) ON DELETE CASCADE,
	userId TEXT NOT NULL,
	tag TEXT,
	team INTEGER REFERENCES TournamentTeams(id) ON DELETE CASCADE,
	UNIQUE (tournamentId, tag),
	FOREIGN KEY (tag, userId) REFERENCES SupercellPlayers(tag, userId) ON DELETE RESTRICT,
	PRIMARY KEY (tournamentId, userId)
);