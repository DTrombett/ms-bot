-- Migration: decouple players from users
-- Migrates the old Users table (with inline brawl/clash columns) to the new
-- schema that stores player profiles in a dedicated SupercellPlayers table.
--
-- SupercellPlayerType enum values:  BrawlStars = 0,  ClashRoyale = 1
-- Run this script once against the existing D1 database before deploying the
-- new worker code.  Safe to run multiple times (uses INSERT OR IGNORE / IF NOT EXISTS).

PRAGMA foreign_keys = OFF;

BEGIN;

-- 1. Create the new SupercellPlayers table if it does not exist yet.
CREATE TABLE IF NOT EXISTS SupercellPlayers (
	tag TEXT NOT NULL,
	type INTEGER NOT NULL,
	userId TEXT NOT NULL,
	notifications INTEGER DEFAULT 0,
	data TEXT,
	active BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY (tag, type),
	FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- 2. Migrate Brawl Stars players (type = 0).
--    Each row in the old Users table with a non-null brawlTag becomes one row
--    in SupercellPlayers.  The cached brawler data is left NULL; it will be
--    populated on the next notification run.
INSERT OR IGNORE INTO SupercellPlayers (tag, type, userId, notifications, active)
SELECT brawlTag, 0, id, COALESCE(brawlNotifications, 0), 1
FROM Users
WHERE brawlTag IS NOT NULL;

-- 3. Migrate Clash Royale players (type = 1).
INSERT OR IGNORE INTO SupercellPlayers (tag, type, userId, notifications, active)
SELECT clashTag, 1, id, COALESCE(clashNotifications, 0), 1
FROM Users
WHERE clashTag IS NOT NULL;

-- 4. Rebuild the Users table without the now-redundant player columns.
--    SQLite requires the table-rebuild pattern to remove columns.
CREATE TABLE Users_new (
	id TEXT PRIMARY KEY,
	dayPoints INTEGER,
	match TEXT,
	remindMinutes INTEGER,
	reminded INTEGER DEFAULT 0,
	matchPointsHistory TEXT
);

INSERT INTO Users_new (id, dayPoints, match, remindMinutes, reminded, matchPointsHistory)
SELECT id, dayPoints, CAST(match AS TEXT), remindMinutes, reminded, matchPointsHistory
FROM Users;

-- Drop old table and rename the replacement into place.
DROP TABLE Users;
ALTER TABLE Users_new RENAME TO Users;

COMMIT;

PRAGMA foreign_keys = ON;
