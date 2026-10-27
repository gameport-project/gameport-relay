-- Lets a report be up to 2 000 000 bytes: a report of more than 600 000 bytes is cut into parts, each in a row of its own (a row holds 2 MB at most, and the zip is stored as base64).
-- Adds two new tables and touches nothing else. Run it BEFORE deploying the relay that accepts the larger reports (until then a large one is refused with an error and a small one is
-- saved as before). Safe to run again.
-- Run once: npx wrangler d1 execute gameport-votes --remote --command "<the statements of this file>" (one command for each table if --file is refused).
CREATE TABLE IF NOT EXISTS report_parts (
  report_id INTEGER NOT NULL,
  seq       INTEGER NOT NULL,
  data      TEXT    NOT NULL,
  PRIMARY KEY (report_id, seq)
);
CREATE TABLE IF NOT EXISTS report_parts_test (
  report_id INTEGER NOT NULL,
  seq       INTEGER NOT NULL,
  data      TEXT    NOT NULL,
  PRIMARY KEY (report_id, seq)
);
