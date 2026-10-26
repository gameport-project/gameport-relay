-- What a player ticked as going wrong with an answer that says something did (no sound, no controls...): codes from a fixed list, joined by commas.
-- Adds one empty column to each table of votes and touches nothing else. Run it BEFORE deploying the relay that counts them (the relay still saves votes without it,
-- but it cannot keep the ticks, and the summary has nothing to count).
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0011_issues.sql
ALTER TABLE votes ADD COLUMN issues TEXT;
ALTER TABLE votes_test ADD COLUMN issues TEXT;
