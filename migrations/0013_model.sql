-- The model and the codename a device reports (Build.MODEL, Build.DEVICE), kept next to the kind of device (quest, pico...) so that the console and the site can name the exact one.
-- Adds two empty columns to each table of votes and touches nothing else. Run it BEFORE deploying the relay that saves them (the relay still saves votes without it).
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0013_model.sql
ALTER TABLE votes ADD COLUMN model TEXT;
ALTER TABLE votes ADD COLUMN codename TEXT;
ALTER TABLE votes_test ADD COLUMN model TEXT;
ALTER TABLE votes_test ADD COLUMN codename TEXT;
