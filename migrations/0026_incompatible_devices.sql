-- For a database made before an incompatible game could have several reasons, each limited to some devices. The two tables are made again with the key (game, reason) and a
-- `devices` column, and the rows already there are copied: each stays incompatible on every device, as before. Run once, nothing else is touched.
-- `devices` empty means every device; otherwise it is a comma-separated list of kinds of device (quest, pico, phone, tablet, other) and model names (Quest 3, Pico 4).
-- Cloudflare keeps the database's history for 30 days (`wrangler d1 time-travel`), so it can be undone.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0026_incompatible_devices.sql
CREATE TABLE incompatible_new (
  app_id  INTEGER NOT NULL,
  name    TEXT NOT NULL,
  reason  TEXT NOT NULL,
  devices TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL,
  PRIMARY KEY (app_id, reason)
);
INSERT INTO incompatible_new (app_id, name, reason, updated) SELECT app_id, name, reason, updated FROM incompatible;
DROP TABLE incompatible;
ALTER TABLE incompatible_new RENAME TO incompatible;

CREATE TABLE incompatible_test_new (
  app_id  INTEGER NOT NULL,
  name    TEXT NOT NULL,
  reason  TEXT NOT NULL,
  devices TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL,
  PRIMARY KEY (app_id, reason)
);
INSERT INTO incompatible_test_new (app_id, name, reason, updated) SELECT app_id, name, reason, updated FROM incompatible_test;
DROP TABLE incompatible_test;
ALTER TABLE incompatible_test_new RENAME TO incompatible_test;
