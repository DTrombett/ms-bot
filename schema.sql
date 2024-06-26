DROP TABLE IF EXISTS MatchDays;
DROP TABLE IF EXISTS Predictions;
DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
	id VARCHAR(31) PRIMARY KEY,
	dayPoints INTEGER,
	matchPointsHistory VARCHAR(255),
	team VARCHAR(15)
);
CREATE TABLE Predictions (
	matchId VARCHAR(15) NOT NULL,
	userId VARCHAR(31) NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
	prediction VARCHAR(255) NOT NULL,
	PRIMARY KEY (userId, matchId)
);