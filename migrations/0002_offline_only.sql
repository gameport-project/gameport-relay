-- For a database made before the answer "it works, but only offline" existed: the table has to be made again, since SQLite cannot change a CHECK.
-- Run once, after 0001: npx wrangler d1 execute gameport-votes --remote --file=migrations/0002_offline_only.sql
CREATE TABLE votes_new (
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,
  game    TEXT,
  device  TEXT    NOT NULL,
  offline INTEGER NOT NULL DEFAULT 0,
  updated TEXT    NOT NULL,
  PRIMARY KEY (app_id, voter)
);
INSERT INTO votes_new (app_id, voter, verdict, app, game, device, offline, updated) SELECT app_id, voter, verdict, app, game, device, offline, updated FROM votes;
DROP TABLE votes;
ALTER TABLE votes_new RENAME TO votes;

CREATE TABLE votes_test_new (
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,
  game    TEXT,
  device  TEXT    NOT NULL,
  offline INTEGER NOT NULL DEFAULT 0,
  updated TEXT    NOT NULL,
  PRIMARY KEY (app_id, voter)
);
INSERT INTO votes_test_new (app_id, voter, verdict, app, game, device, offline, updated) SELECT app_id, voter, verdict, app, game, device, offline, updated FROM votes_test;
DROP TABLE votes_test;
ALTER TABLE votes_test_new RENAME TO votes_test;
