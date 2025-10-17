DROP TABLE IF EXISTS Predictions;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Reminders;
CREATE TABLE Users (
	id VARCHAR(31) PRIMARY KEY,
	brawlTag VARCHAR(15),
	brawlNotifications INTEGER DEFAULT 0,
	brawlers TEXT,
	brawlTrophies INTEGER,
	dayPoints INTEGER,
	match INTEGER,
	remindMinutes INTEGER,
	reminded INTEGER DEFAULT 0,
	matchPointsHistory VARCHAR(255)
);
CREATE TABLE Predictions (
	matchId INTEGER NOT NULL,
	userId VARCHAR(31) NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
	prediction VARCHAR(255) NOT NULL,
	PRIMARY KEY (userId, matchId)
);
CREATE TABLE Reminders (
	id VARCHAR(63) NOT NULL,
	date VARCHAR(255) NOT NULL,
	userId VARCHAR(31) NOT NULL,
	remind VARCHAR(1023) NOT NULL,
	PRIMARY KEY (id, userId)
);