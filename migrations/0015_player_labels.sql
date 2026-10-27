-- The name the developer gives to a player in the console (a Discord name, say), for the real set and for the test one. Adds two new tables and touches nothing else.
-- Run it BEFORE deploying the relay that reads them. Safe to run again.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0015_player_labels.sql
CREATE TABLE IF NOT EXISTS player_labels (
  voter   TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS player_labels_test (
  voter   TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  updated TEXT NOT NULL
);
