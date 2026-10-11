-- For a database made before votes could be marked as fixed: only adds two columns, empty for every vote, touches nothing else.
-- A vote with a day in `fixed` is no longer counted in the totals ("it did not work", then the problem was solved). `fixed_in` says where, as free text (a version of GamePort).
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0004_fixed.sql
ALTER TABLE votes ADD COLUMN fixed TEXT;
ALTER TABLE votes ADD COLUMN fixed_in TEXT;
ALTER TABLE votes_test ADD COLUMN fixed TEXT;
ALTER TABLE votes_test ADD COLUMN fixed_in TEXT;
