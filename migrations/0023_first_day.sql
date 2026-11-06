-- The day each line of the history began. `updated` is moved forward by a renewed answer (the same answer, version and build again), so it cannot tell when a player first gave an answer or first
-- appeared on a version of GamePort; this column keeps that day, for the console's home (new players, answers by day, how fast the players move to a new version).
-- The lines that exist already get their `updated` as a best guess: it is exact for a line never renewed, and later than the truth for one that was.
-- Adds a column to the two histories and touches nothing else (the views list their columns, so they are not changed).
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0023_first_day.sql
ALTER TABLE vote_history ADD COLUMN first_day TEXT;
UPDATE vote_history SET first_day = updated WHERE first_day IS NULL;
ALTER TABLE vote_history_test ADD COLUMN first_day TEXT;
UPDATE vote_history_test SET first_day = updated WHERE first_day IS NULL;
