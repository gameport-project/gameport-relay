-- For a database made before reports existed: only adds the two tables, touches nothing else.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0003_reports.sql

-- The technical report a player's app sends after "it did not work" (a zip of facts and logs, redacted by the app). One per player and per game: a
-- new one replaces the old. The zip is kept as base64 text. Rows older than 30 days are removed each time a report arrives.
CREATE TABLE IF NOT EXISTS reports (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,  -- the same short salted hash as in votes
  app     TEXT    NOT NULL,  -- the version of GamePort
  device  TEXT    NOT NULL,  -- quest, pico, phone, tablet or other
  size    INTEGER NOT NULL,  -- bytes of the zip
  data    TEXT    NOT NULL,  -- the zip, base64
  updated TEXT    NOT NULL,  -- the day, YYYY-MM-DD
  UNIQUE (app_id, voter)
);

-- The same table for the test builds of the app (the /test routes).
CREATE TABLE IF NOT EXISTS reports_test (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  app     TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  size    INTEGER NOT NULL,
  data    TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  UNIQUE (app_id, voter)
);
