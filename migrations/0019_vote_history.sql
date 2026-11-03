-- Keeps every answer a player gave, not only the last: `votes` (one line per player and game, a new answer replaced the old one) becomes the table `vote_history` (one line per answer),
-- and `votes` becomes a view of it, the last line of each player and game, with the same columns, so everything that reads `votes` reads the same thing as before.
-- The answers kept today become the first line of each player and game. What was replaced before this is gone: the history starts here.
-- Needs the columns of migrations 0004, 0009, 0011, 0013 and 0017 (they are all in `votes` already). Run it ONCE, and run it BEFORE deploying the relay that writes the history: until then
-- the relay still saves an answer the old way, which stops working as soon as `votes` is a view, so deploy right after. The test set has its own copy below.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0019_vote_history.sql
CREATE TABLE vote_history (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,
  game    TEXT,
  device  TEXT    NOT NULL,
  offline INTEGER NOT NULL DEFAULT 0,
  updated TEXT    NOT NULL,
  fixed   TEXT,
  fixed_in TEXT,
  voted_at TEXT,
  issues  TEXT,
  model   TEXT,
  codename TEXT,
  report_state TEXT
);
INSERT INTO vote_history (app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state)
  SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state FROM votes ORDER BY updated, voted_at, app_id, voter;
DROP TABLE votes;
CREATE INDEX vote_history_player ON vote_history (app_id, voter, id);
CREATE VIEW votes AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state FROM vote_history WHERE id IN (SELECT MAX(id) FROM vote_history GROUP BY app_id, voter);

CREATE TABLE vote_history_test (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,
  game    TEXT,
  device  TEXT    NOT NULL,
  offline INTEGER NOT NULL DEFAULT 0,
  updated TEXT    NOT NULL,
  fixed   TEXT,
  fixed_in TEXT,
  voted_at TEXT,
  issues  TEXT,
  model   TEXT,
  codename TEXT,
  report_state TEXT
);
INSERT INTO vote_history_test (app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state)
  SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state FROM votes_test ORDER BY updated, voted_at, app_id, voter;
DROP TABLE votes_test;
CREATE INDEX vote_history_test_player ON vote_history_test (app_id, voter, id);
CREATE VIEW votes_test AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state FROM vote_history_test WHERE id IN (SELECT MAX(id) FROM vote_history_test GROUP BY app_id, voter);
