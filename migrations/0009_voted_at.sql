-- For a database made before the console showed what is new: adds a column, empty for every vote saved so far, and the table of what the console has seen. Touches nothing else.
-- `voted_at` is when the relay saved the vote (UTC, rounded down to the hour); the relay sets it, never the app. Run it BEFORE deploying the relay that writes it.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0009_voted_at.sql
ALTER TABLE votes ADD COLUMN voted_at TEXT;
ALTER TABLE votes_test ADD COLUMN voted_at TEXT;
CREATE TABLE IF NOT EXISTS console_seen (
  name TEXT PRIMARY KEY,
  at   TEXT NOT NULL
);
