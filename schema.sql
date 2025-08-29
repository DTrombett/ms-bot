DROP TABLE IF EXISTS Predictions;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Reminders;
DROP TABLE IF EXISTS BrawlStarsUsers;
DROP TABLE IF EXISTS BrawlStarsNotifications;
CREATE TABLE Users (
	id VARCHAR(31) PRIMARY KEY,
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
CREATE TABLE BrawlStarsUsers (
	userId VARCHAR(31) PRIMARY KEY,
	playerTag VARCHAR(31) NOT NULL,
	lastTrophies INTEGER DEFAULT 0,
	lastHighestTrophies INTEGER DEFAULT 0,
	lastRankedTrophies INTEGER DEFAULT 0,
	lastBrawlerCount INTEGER DEFAULT 0,
	lastChecked INTEGER DEFAULT 0
);
CREATE TABLE BrawlStarsNotifications (
	userId VARCHAR(31) NOT NULL REFERENCES BrawlStarsUsers(userId) ON DELETE CASCADE,
	notificationType VARCHAR(63) NOT NULL,
	enabled INTEGER DEFAULT 1,
	PRIMARY KEY (userId, notificationType)
);