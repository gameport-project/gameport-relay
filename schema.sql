-- One row per player and per game: a player who changes their mind replaces their vote, so a game is counted once per player.
CREATE TABLE IF NOT EXISTS votes (
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,  -- a short salted hash, never the id the app keeps
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,  -- the version of GamePort
  game    TEXT,              -- the build of the game, when the app knows it
  device  TEXT    NOT NULL,  -- quest, pico, phone, tablet or other
  offline INTEGER NOT NULL DEFAULT 0,  -- 1 when it worked with GamePort's offline mode on, which only a vote that says "works" can carry
  updated TEXT    NOT NULL,  -- the day, YYYY-MM-DD: no finer than that
  fixed   TEXT,              -- the day the problem was solved: from then on the vote is no longer counted; empty while it counts
  fixed_in TEXT,             -- where it was solved, free text (a version of GamePort); only for the developer
  voted_at TEXT,             -- when the relay saved the vote, UTC, rounded down to the hour (YYYY-MM-DDTHH:00:00Z): only for the developer's console; empty for the votes saved before it existed
  PRIMARY KEY (app_id, voter)
);

-- The same table for the test builds of the app (the /test routes): what they send never reaches the real totals.
CREATE TABLE IF NOT EXISTS votes_test (
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,  -- a short salted hash, never the id the app keeps
  verdict TEXT    NOT NULL CHECK (verdict IN ('works', 'offline_only', 'fails')),
  app     TEXT    NOT NULL,  -- the version of GamePort
  game    TEXT,              -- the build of the game, when the app knows it
  device  TEXT    NOT NULL,  -- quest, pico, phone, tablet or other
  offline INTEGER NOT NULL DEFAULT 0,  -- 1 when it worked with GamePort's offline mode on, which only a vote that says "works" can carry
  updated TEXT    NOT NULL,  -- the day, YYYY-MM-DD: no finer than that
  fixed   TEXT,              -- the day the problem was solved: from then on the vote is no longer counted; empty while it counts
  fixed_in TEXT,             -- where it was solved, free text (a version of GamePort); only for the developer
  voted_at TEXT,             -- when the relay saved the vote, UTC, rounded down to the hour (YYYY-MM-DDTHH:00:00Z): only for the developer's console; empty for the votes saved before it existed
  PRIMARY KEY (app_id, voter)
);

-- The technical report a player's app sends after "it did not work" (a zip of facts and logs, redacted by the app). One per player and per game: a
-- new one replaces the old. The zip is kept as base64 text. Rows older than 30 days are removed each time a report arrives.
CREATE TABLE IF NOT EXISTS reports (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,  -- the same short salted hash as in votes
  app     TEXT    NOT NULL,  -- the version of GamePort
  device  TEXT    NOT NULL,  -- quest, pico, phone, tablet or other
  size    INTEGER NOT NULL,  -- bytes of the zip
  data    TEXT    NOT NULL,  -- the zip, base64
  updated TEXT    NOT NULL,  -- the day, YYYY-MM-DD
  handled TEXT,              -- the day the developer dealt with it; empty while it waits. A new report from the same player starts again as not handled
  UNIQUE (app_id, voter)
);

-- The same table for the test builds of the app (the /test routes).
CREATE TABLE IF NOT EXISTS reports_test (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id  INTEGER NOT NULL,
  voter   TEXT    NOT NULL,
  app     TEXT    NOT NULL,
  device  TEXT    NOT NULL,
  size    INTEGER NOT NULL,
  data    TEXT    NOT NULL,
  updated TEXT    NOT NULL,
  handled TEXT,
  UNIQUE (app_id, voter)
);

-- Why a game cannot run through GamePort: one row per reason, with its title and its explanation in each language. Many games share a reason. Only the
-- developer writes here (the console); the app and the site read it with the list of games (the /incompatible routes), so nothing is typed per game.
CREATE TABLE IF NOT EXISTS incompatible_reasons (
  id       TEXT PRIMARY KEY,  -- a short word, e.g. anti-tamper
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  text_en  TEXT NOT NULL,
  text_fr  TEXT NOT NULL
);

-- The games confirmed as incompatible, each with the reason it is on the list for. Taking a game out, once it works, shows at once everywhere.
CREATE TABLE IF NOT EXISTS incompatible (
  app_id  INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  reason  TEXT NOT NULL,    -- an id of incompatible_reasons
  updated TEXT NOT NULL     -- the day, YYYY-MM-DD
);

-- The same two tables for the test builds of the app (the /test routes).
CREATE TABLE IF NOT EXISTS incompatible_reasons_test (
  id       TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  text_en  TEXT NOT NULL,
  text_fr  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incompatible_test (
  app_id  INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  reason  TEXT NOT NULL,
  updated TEXT NOT NULL
);

-- What the developer's console has already shown: one row per list ('votes-prod', 'votes-test', 'games'), with the hour (or, for the games, the day) of the last time
-- the news were opened. Only the console reads and writes it.
CREATE TABLE IF NOT EXISTS console_seen (
  name TEXT PRIMARY KEY,
  at   TEXT NOT NULL
);
