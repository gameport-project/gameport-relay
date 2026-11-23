-- The libraries of a game that a player chose to send, with a report, to help find why it does not work. Same shape as the reports (one per player and per game, the latest replaces the old,
-- the zip kept as base64 and cut into parts when large), in tables of their own so that sending them never replaces the player's real report. The Discord name that comes with them is kept
-- in player_contacts, as for the answers. Adds four new tables and touches nothing else. Safe to run again.
-- Run once, BEFORE deploying the relay that takes them: npx wrangler d1 execute gameport-votes --remote --file=migrations/0028_libraries.sql
CREATE TABLE IF NOT EXISTS libraries (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  app     TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  size    INTEGER NOT NULL,
  data    TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  handled TEXT,
  UNIQUE (app_id, voter)
);
CREATE TABLE IF NOT EXISTS libraries_test (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  app     TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  size    INTEGER NOT NULL,
  data    TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  handled TEXT,
  UNIQUE (app_id, voter)
);
CREATE TABLE IF NOT EXISTS library_parts (
  report_id INTEGER NOT NULL,
  seq       INTEGER NOT NULL,
  data      TEXT    NOT NULL,
  PRIMARY KEY (report_id, seq)
);
CREATE TABLE IF NOT EXISTS library_parts_test (
  report_id INTEGER NOT NULL,
  seq       INTEGER NOT NULL,
  data      TEXT    NOT NULL,
  PRIMARY KEY (report_id, seq)
);
