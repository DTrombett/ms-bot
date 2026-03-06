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
	userId TEXT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
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