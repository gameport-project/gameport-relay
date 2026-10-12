-- Superseded by 0007_incompatible_reasons.sql (a table of reasons instead of a text per game). Kept because it was run once; a new database uses schema.sql.
-- For a database made before the list of incompatible games lived here: only adds two tables, touches nothing else.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0006_incompatible.sql
CREATE TABLE IF NOT EXISTS incompatible (
  app_id   INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  text_en  TEXT NOT NULL,
  text_fr  TEXT NOT NULL,
  updated  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS incompatible_test (
  app_id   INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  text_en  TEXT NOT NULL,
  text_fr  TEXT NOT NULL,
  updated  TEXT NOT NULL
);

-- The game that was on the list shipped with the app until now, so it stays incompatible for everyone. Taking it off is done in the console.
INSERT OR IGNORE INTO incompatible (app_id, name, title_en, title_fr, text_en, text_fr, updated) VALUES (
  438100, 'VRChat', 'Protected against modification', 'Protégé contre la modification',
  'the game detects that its files were modified and closes itself after a few seconds. Nothing can be done about it from GamePort.',
  'le jeu détecte que ses fichiers ont été modifiés et se ferme de lui-même au bout de quelques secondes. GamePort n''y peut rien.',
  '2026-10-12'
);
