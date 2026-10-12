-- For the database that ran 0006 (a reason typed for each game): the list now has a table of reasons and each game only names one. The only game on the list
-- until now is VRChat, put back below with its reason; anything else added meanwhile has to be marked again in the console.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0007_incompatible_reasons.sql
DROP TABLE IF EXISTS incompatible;
DROP TABLE IF EXISTS incompatible_test;
CREATE TABLE incompatible_reasons (id TEXT PRIMARY KEY, title_en TEXT NOT NULL, title_fr TEXT NOT NULL, text_en TEXT NOT NULL, text_fr TEXT NOT NULL);
CREATE TABLE incompatible (app_id INTEGER PRIMARY KEY, name TEXT NOT NULL, reason TEXT NOT NULL, updated TEXT NOT NULL);
CREATE TABLE incompatible_reasons_test (id TEXT PRIMARY KEY, title_en TEXT NOT NULL, title_fr TEXT NOT NULL, text_en TEXT NOT NULL, text_fr TEXT NOT NULL);
CREATE TABLE incompatible_test (app_id INTEGER PRIMARY KEY, name TEXT NOT NULL, reason TEXT NOT NULL, updated TEXT NOT NULL);
INSERT INTO incompatible_reasons (id, title_en, title_fr, text_en, text_fr) VALUES (
  'anti-tamper', 'Protected against modification', 'Protégé contre la modification',
  'the game detects that its files were modified and closes itself after a few seconds. Nothing can be done about it from GamePort.',
  'le jeu détecte que ses fichiers ont été modifiés et se ferme de lui-même au bout de quelques secondes. GamePort n''y peut rien.'
);
INSERT INTO incompatible (app_id, name, reason, updated) VALUES (438100, 'VRChat', 'anti-tamper', '2026-10-12');
