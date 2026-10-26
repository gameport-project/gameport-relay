-- Two made-up votes of the test set for PAYDAY: Aces High Demo (5219700), with what the players ticked as going wrong, so the console in test mode has something to show.
-- They are fake: the voters are not real hashes, and the test set never reaches the real totals. Needs migration 0011 first. Safe to run again: what exists is left as it is.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0012_issues_test_seed.sql
INSERT OR IGNORE INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated, voted_at, issues)
  VALUES (5219700, 'seedtest0001', 'fails', '0.9.0', NULL, 'quest', 0, '2026-10-26', '2026-10-26T12:00:00Z', 'no_sound,no_controls');
INSERT OR IGNORE INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated, voted_at, issues)
  VALUES (5219700, 'seedtest0002', 'fails', '0.9.0', NULL, 'pico', 0, '2026-10-26', '2026-10-26T12:30:00Z', 'no_image,closes');
