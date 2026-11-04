-- How steadily a game ran for a player: three numbers the app adds to an answer when the player agrees to send them (after seeing them). Seconds counted is the play the hook of GamePort
-- could measure (the session in focus, after its first minute, at least three minutes of it); seconds held is how many of them reached the frame rate the screen asked for without the
-- system showing old frames again; the target is that frame rate. All three are empty for an answer that came without them, and nothing in them says who played or what.
-- `votes` and `votes_test` are views with a list of columns, so they are made again with the new ones.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0020_performance.sql
-- In either order with the deploy of the relay: the relay saves an answer without these numbers while the columns are missing, and an older relay ignores them once they are there.
ALTER TABLE vote_history ADD COLUMN perf_seconds INTEGER;
ALTER TABLE vote_history ADD COLUMN perf_held INTEGER;
ALTER TABLE vote_history ADD COLUMN perf_target INTEGER;
DROP VIEW votes;
CREATE VIEW votes AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state, perf_seconds, perf_held, perf_target FROM vote_history WHERE id IN (SELECT MAX(id) FROM vote_history GROUP BY app_id, voter);

ALTER TABLE vote_history_test ADD COLUMN perf_seconds INTEGER;
ALTER TABLE vote_history_test ADD COLUMN perf_held INTEGER;
ALTER TABLE vote_history_test ADD COLUMN perf_target INTEGER;
DROP VIEW votes_test;
CREATE VIEW votes_test AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state, perf_seconds, perf_held, perf_target FROM vote_history_test WHERE id IN (SELECT MAX(id) FROM vote_history_test GROUP BY app_id, voter);
