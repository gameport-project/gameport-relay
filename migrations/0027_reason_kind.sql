-- For a database made before a reason could only warn. Each reason gets a kind: 'blocks' (the game cannot run, as every reason was until now) or 'warns' (the game runs
-- and the app and the site tell about it, for instance that it may close on its own on some devices). The reasons already there stay 'blocks'. Run once, nothing else is touched.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0027_reason_kind.sql
ALTER TABLE incompatible_reasons ADD COLUMN kind TEXT NOT NULL DEFAULT 'blocks';
ALTER TABLE incompatible_reasons_test ADD COLUMN kind TEXT NOT NULL DEFAULT 'blocks';
