-- Votes the developer added by hand in the console were saved with the version "admin". They get the version of GamePort that was out when they were added: the newest release (test builds
-- left out) published before the time of the line. A line keeps its hour rounded down (voted_at), so the middle of that hour is used; a line with no hour is taken at noon of its day, UTC.
-- A line from before the first release stays "admin". The times are those of the releases on GitHub (published_at, UTC). The console no longer writes "admin": a vote added without a version takes the newest release seen.
-- Check first what it would do (read-only): see the query in the README of the relay. Cloudflare keeps the database's history for 30 days (`wrangler d1 time-travel`). Safe to run again.
-- Run once: npx wrangler d1 execute gameport-votes --remote --file=migrations/0025_admin_versions.sql
UPDATE vote_history SET app = COALESCE((
  WITH releases(version, at) AS (VALUES
('0.5.0', '2026-10-01T20:20:49Z'),
('0.5.1', '2026-10-01T21:22:54Z'),
('0.6.0', '2026-10-02T16:31:49Z'),
('0.7.0', '2026-10-03T13:59:55Z'),
('0.7.1', '2026-10-05T07:50:00Z'),
('0.7.2', '2026-10-08T21:51:08Z'),
('0.7.3', '2026-10-09T08:26:15Z'),
('0.7.4', '2026-10-10T14:02:28Z'),
('0.8.0', '2026-10-11T15:22:31Z'),
('0.8.1', '2026-10-11T22:42:23Z'),
('0.8.2', '2026-10-12T17:27:07Z'),
('0.9.0', '2026-10-25T19:22:50Z'),
('0.9.1', '2026-10-26T18:44:51Z'),
('0.9.2', '2026-10-29T19:10:02Z'),
('0.9.3', '2026-11-04T00:31:17Z'),
('0.9.4', '2026-11-04T23:23:52Z')
  )
  SELECT version FROM releases WHERE at <= COALESCE(strftime('%Y-%m-%dT%H:%M:%SZ', vote_history.voted_at, '+30 minutes'), vote_history.updated || 'T12:00:00Z') ORDER BY at DESC LIMIT 1
), app) WHERE app = 'admin';

UPDATE vote_history_test SET app = COALESCE((
  WITH releases(version, at) AS (VALUES
('0.5.0', '2026-10-01T20:20:49Z'),
('0.5.1', '2026-10-01T21:22:54Z'),
('0.6.0', '2026-10-02T16:31:49Z'),
('0.7.0', '2026-10-03T13:59:55Z'),
('0.7.1', '2026-10-05T07:50:00Z'),
('0.7.2', '2026-10-08T21:51:08Z'),
('0.7.3', '2026-10-09T08:26:15Z'),
('0.7.4', '2026-10-10T14:02:28Z'),
('0.8.0', '2026-10-11T15:22:31Z'),
('0.8.1', '2026-10-11T22:42:23Z'),
('0.8.2', '2026-10-12T17:27:07Z'),
('0.9.0', '2026-10-25T19:22:50Z'),
('0.9.1', '2026-10-26T18:44:51Z'),
('0.9.2', '2026-10-29T19:10:02Z'),
('0.9.3', '2026-11-04T00:31:17Z'),
('0.9.4', '2026-11-04T23:23:52Z')
  )
  SELECT version FROM releases WHERE at <= COALESCE(strftime('%Y-%m-%dT%H:%M:%SZ', vote_history_test.voted_at, '+30 minutes'), vote_history_test.updated || 'T12:00:00Z') ORDER BY at DESC LIMIT 1
), app) WHERE app = 'admin';
