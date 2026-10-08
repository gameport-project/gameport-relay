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
  PRIMARY KEY (app_id, voter)
);
