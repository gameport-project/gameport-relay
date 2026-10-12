-- Puts VRChat, with its reason, in the test tables too, so the test builds of the app see the same list. Safe to run again: what exists is left as it is.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0008_incompatible_test_seed.sql
INSERT OR IGNORE INTO incompatible_reasons_test (id, title_en, title_fr, text_en, text_fr) VALUES (
  'anti-tamper', 'Protected against modification', 'Protégé contre la modification',
  'the game detects that its files were modified and closes itself after a few seconds. Nothing can be done about it from GamePort.',
  'le jeu détecte que ses fichiers ont été modifiés et se ferme de lui-même au bout de quelques secondes. GamePort n''y peut rien.'
);
INSERT OR IGNORE INTO incompatible_test (app_id, name, reason, updated) VALUES (438100, 'VRChat', 'anti-tamper', '2026-10-12');
