-- What the developer tells the app about a game from the console (for now: the games that declare the headset's passthrough), for the real set and for the test one.
-- Adds two new tables and touches nothing else. Run it BEFORE deploying the relay that reads them. Safe to run again.
-- Run once, one command for each table: npx wrangler d1 execute gameport-votes --remote --command "CREATE TABLE IF NOT EXISTS game_defaults (app_id INTEGER NOT NULL, setting TEXT NOT NULL, value TEXT NOT NULL, updated TEXT NOT NULL, PRIMARY KEY (app_id, setting))"
CREATE TABLE IF NOT EXISTS game_defaults (
  app_id  INTEGER NOT NULL,
  setting TEXT    NOT NULL,
  value   TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  PRIMARY KEY (app_id, setting)
);
CREATE TABLE IF NOT EXISTS game_defaults_test (
  app_id  INTEGER NOT NULL,
  setting TEXT    NOT NULL,
  value   TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  PRIMARY KEY (app_id, setting)
);
