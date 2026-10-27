-- What became of the technical report the app sends just before an answer that says something went wrong (sent, waiting, refused or none), kept with the answer so that the console
-- tells why there is no report. Adds one empty column to each table of votes and touches nothing else. Run it BEFORE deploying the relay that saves it (the relay still saves votes without it).
-- Run once: npx wrangler d1 execute gameport-votes --remote --command "ALTER TABLE votes ADD COLUMN report_state TEXT" (and the same for votes_test).
ALTER TABLE votes ADD COLUMN report_state TEXT;
ALTER TABLE votes_test ADD COLUMN report_state TEXT;
