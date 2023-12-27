DROP TABLE IF EXISTS MatchDays;
CREATE TABLE IF NOT EXISTS MatchDays (
	Day INTEGER PRIMARY KEY,
	Finished BOOLEAN,
	PredictionsSent BOOLEAN,
	MessageId VARCHAR(31)
);
DROP TABLE IF EXISTS Matches;
CREATE TABLE IF NOT EXISTS Matches (
	Id SERIAL PRIMARY KEY,
	Day INTEGER,
	MatchDate TIMESTAMP,
	Teams VARCHAR(255),
	FOREIGN KEY (Day) REFERENCES MatchDays(Day)
);
DROP TABLE IF EXISTS RSSes;
CREATE TABLE IF NOT EXISTS RSSes (
	Id SERIAL PRIMARY KEY,
	Channel VARCHAR(31),
	ErrorsCount INTEGER,
	Guild VARCHAR(31),
	Link VARCHAR(31),
	Title VARCHAR(255),
	LastUpdate TIMESTAMP
);
DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (
	Id VARCHAR(31),
	DayPoints INTEGER,
	MatchPointsHistory VARCHAR(255)
);
DROP TABLE IF EXISTS Predictions;
CREATE TABLE IF NOT EXISTS Predictions (
	Id SERIAL PRIMARY KEY,
	UserId VARCHAR(31),
	Prediction VARCHAR(255),
	Teams VARCHAR(255),
	FOREIGN KEY (UserId) REFERENCES Users(Id)
);