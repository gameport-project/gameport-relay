-- The Discord name a player typed (to talk about their answers on the project's Discord) is kept once per player, in a table of its own that only the console reads: it is not part of any
-- vote, so every answer of the player shows it, the old ones too. This adds the two tables, copies the name each player gave (the latest line that holds one) and drops the two columns
-- (`discord`, `code`) that an earlier version of this migration had left on the history of the answers, and in the views of the last answers, which are made again without them (a view
-- lists its columns, and a column cannot be dropped while a view names it). The reports no longer have those columns.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0022_player_contacts.sql
CREATE TABLE IF NOT EXISTS player_contacts (
  voter   TEXT PRIMARY KEY,
  discord TEXT NOT NULL,
  updated TEXT NOT NULL
);
INSERT OR IGNORE INTO player_contacts (voter, discord, updated)
SELECT voter, discord, updated FROM vote_history WHERE discord IS NOT NULL AND discord <> '' ORDER BY id DESC;
DROP VIEW IF EXISTS votes;
CREATE VIEW votes AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state, perf_seconds, perf_held, perf_target FROM vote_history WHERE id IN (SELECT MAX(id) FROM vote_history GROUP BY app_id, voter);
ALTER TABLE vote_history DROP COLUMN discord;
ALTER TABLE vote_history DROP COLUMN code;

CREATE TABLE IF NOT EXISTS player_contacts_test (
  voter   TEXT PRIMARY KEY,
  discord TEXT NOT NULL,
  updated TEXT NOT NULL
);
INSERT OR IGNORE INTO player_contacts_test (voter, discord, updated)
SELECT voter, discord, updated FROM vote_history_test WHERE discord IS NOT NULL AND discord <> '' ORDER BY id DESC;
DROP VIEW IF EXISTS votes_test;
CREATE VIEW votes_test AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state, perf_seconds, perf_held, perf_target FROM vote_history_test WHERE id IN (SELECT MAX(id) FROM vote_history_test GROUP BY app_id, voter);
ALTER TABLE vote_history_test DROP COLUMN discord;
ALTER TABLE vote_history_test DROP COLUMN code;
