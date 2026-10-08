-- For a database created before the "worked offline" column existed. Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0001_offline.sql
ALTER TABLE votes ADD COLUMN offline INTEGER NOT NULL DEFAULT 0;
ALTER TABLE votes_test ADD COLUMN offline INTEGER NOT NULL DEFAULT 0;
