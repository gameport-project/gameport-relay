-- The feedback of players on the controllers of a game: whether the mapping of the game's controls onto the buttons of the device works, for each game and each family of device (a Quest and a
-- Pico are told apart). `controller_feedback` holds the current line of each player (the last send replaces the one before, so a player counts only for their current mapping);
-- `controller_feedback_history` keeps every send, nothing is lost. The player is the same short salted hash as in the votes. Adds four new tables and an index on each current table, and touches
-- nothing else. Safe to run again.
-- Run once, BEFORE deploying the relay that takes them: npx wrangler d1 execute gameport-votes --remote --file=migrations/0029_controller_feedback.sql
CREATE TABLE IF NOT EXISTS controller_feedback (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,  -- a short salted hash, never the id the app keeps
  device  TEXT    NOT NULL,  -- quest, pico, phone, tablet or other
  mapping TEXT    NOT NULL,  -- the effective split of the game's commands over the device's buttons, in the form the app writes (see README.md)
  preset  TEXT,              -- faces, dpad_vertical or dpad_horizontal when the mapping is a preset; empty otherwise
  answer  TEXT    NOT NULL CHECK (answer IN ('works', 'partial', 'fails')),
  app     TEXT    NOT NULL,  -- the version of GamePort
  updated TEXT    NOT NULL,  -- when the relay saved it, UTC, rounded down to the hour (YYYY-MM-DDTHH:00:00Z)
  UNIQUE (app_id, voter, device)
);
CREATE TABLE IF NOT EXISTS controller_feedback_test (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  mapping TEXT    NOT NULL,
  preset  TEXT,
  answer  TEXT    NOT NULL CHECK (answer IN ('works', 'partial', 'fails')),
  app     TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  UNIQUE (app_id, voter, device)
);
CREATE TABLE IF NOT EXISTS controller_feedback_history (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  mapping TEXT    NOT NULL,
  preset  TEXT,
  answer  TEXT    NOT NULL CHECK (answer IN ('works', 'partial', 'fails')),
  app     TEXT    NOT NULL,
  created TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS controller_feedback_history_test (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  mapping TEXT    NOT NULL,
  preset  TEXT,
  answer  TEXT    NOT NULL CHECK (answer IN ('works', 'partial', 'fails')),
  app     TEXT    NOT NULL,
  created TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS controller_feedback_game ON controller_feedback (app_id, device);
CREATE INDEX IF NOT EXISTS controller_feedback_test_game ON controller_feedback_test (app_id, device);
