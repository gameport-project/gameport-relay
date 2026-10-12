-- For a database made before reports could be marked as handled: only adds a column, empty for every report, touches nothing else.
-- A report with a day in `handled` is one the developer has downloaded and dealt with. A new report from the same player replaces the old and starts again as not handled.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0005_reports_handled.sql
ALTER TABLE reports ADD COLUMN handled TEXT;
ALTER TABLE reports_test ADD COLUMN handled TEXT;
