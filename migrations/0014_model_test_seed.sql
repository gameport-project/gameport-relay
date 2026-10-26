-- Gives the two made-up votes of the test set for PAYDAY: Aces High Demo (5219700) a model and a codename, and adds a third from a tablet, so the console in test mode shows the names.
-- They are fake and the test set never reaches the real totals. Needs migrations 0011 and 0013 first. Safe to run again.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0014_model_test_seed.sql
UPDATE votes_test SET model = 'Quest 3', codename = 'eureka' WHERE app_id = 5219700 AND voter = 'seedtest0001';
UPDATE votes_test SET model = 'A8110', codename = NULL WHERE app_id = 5219700 AND voter = 'seedtest0002';
INSERT OR IGNORE INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated, voted_at, issues, model, codename)
  VALUES (5219700, 'seedtest0003', 'works', '0.9.0', NULL, 'phone', 0, '2026-10-26', '2026-10-26T13:00:00Z', NULL, 'SM-S918B', 'dm3q');
