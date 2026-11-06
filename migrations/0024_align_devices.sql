-- Lines of the history that came without a model (the app did not send it yet: only the kind of device, "pico") get the model of the same player's other lines of that kind, when the
-- player gave exactly one model of the kind (the same install is the same device). A player with two models of a kind is left as it is, and a line that has a model is never changed.
-- The relay does the same by itself from now on, each time an answer comes with a model: this is the catch-up for what is already stored. Safe to run again.
-- Check first how many lines it touches (read-only): see the query in the README of the relay. Cloudflare keeps the database's history for 30 days (`wrangler d1 time-travel`).
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0024_align_devices.sql
UPDATE vote_history SET
  model = (SELECT MIN(h.model) FROM vote_history h WHERE h.voter = vote_history.voter AND h.device = vote_history.device AND h.model IS NOT NULL AND h.model <> ''),
  codename = CASE WHEN codename IS NULL OR codename = '' THEN (SELECT MIN(h.codename) FROM vote_history h WHERE h.voter = vote_history.voter AND h.device = vote_history.device AND h.model IS NOT NULL AND h.model <> '' AND h.codename IS NOT NULL AND h.codename <> '') ELSE codename END
WHERE (model IS NULL OR model = '')
  AND (SELECT COUNT(DISTINCT h.model) FROM vote_history h WHERE h.voter = vote_history.voter AND h.device = vote_history.device AND h.model IS NOT NULL AND h.model <> '') = 1;

UPDATE vote_history_test SET
  model = (SELECT MIN(h.model) FROM vote_history_test h WHERE h.voter = vote_history_test.voter AND h.device = vote_history_test.device AND h.model IS NOT NULL AND h.model <> ''),
  codename = CASE WHEN codename IS NULL OR codename = '' THEN (SELECT MIN(h.codename) FROM vote_history_test h WHERE h.voter = vote_history_test.voter AND h.device = vote_history_test.device AND h.model IS NOT NULL AND h.model <> '' AND h.codename IS NOT NULL AND h.codename <> '') ELSE codename END
WHERE (model IS NULL OR model = '')
  AND (SELECT COUNT(DISTINCT h.model) FROM vote_history_test h WHERE h.voter = vote_history_test.voter AND h.device = vote_history_test.device AND h.model IS NOT NULL AND h.model <> '') = 1;
