-- The Discord name a player may give with a report, to talk about it on the project's Discord. Optional and typed by the player: nothing checks that it is theirs.
-- Empty for a report that came without one. A new report from the same player replaces it, so a name that was changed or removed goes with the next report.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0021_report_discord.sql
-- In either order with the deploy of the relay: the relay saves a report without the name while the column is missing, and an older relay ignores it once it is there.
-- The code is six characters made from the player's id (see contactCode in worker.js): said on the Discord, it shows that a report is theirs.
ALTER TABLE reports ADD COLUMN discord TEXT;
ALTER TABLE reports ADD COLUMN code TEXT;
ALTER TABLE reports_test ADD COLUMN discord TEXT;
ALTER TABLE reports_test ADD COLUMN code TEXT;
