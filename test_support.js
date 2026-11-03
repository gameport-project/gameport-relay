import { readFileSync } from "node:fs";

// For the tests only: the schema of a database from before migration 0019, to try what the relay does with an older database. The answers are in a table of their own, one line per player
// and game, and there is no history; everything else is the schema of today.
const table = (name) => `CREATE TABLE ${name} (
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,
  game    TEXT,
  device  TEXT    NOT NULL,
  offline INTEGER NOT NULL DEFAULT 0,
  updated TEXT    NOT NULL,
  fixed   TEXT,
  fixed_in TEXT,
  voted_at TEXT,
  issues  TEXT,
  model   TEXT,
  codename TEXT,
  report_state TEXT,
  PRIMARY KEY (app_id, voter)
);
`;

const current = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

export const legacySchema = table("votes") + table("votes_test") + current.slice(current.indexOf("-- The technical report"));
