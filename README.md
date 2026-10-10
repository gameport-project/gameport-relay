# GamePort relay

A small Cloudflare Worker. A player says whether a game worked ("it worked" / "it did not"); the app sends that verdict here; the relay keeps one vote per player and per game in a small database (Cloudflare D1) and publishes the totals. A vote stores no name, no address and no log of who sent what. After "it did not work" or "works offline only" the app also sends a technical report, to help find why (see Reports below).

```
app --POST /vote--> relay --> database (one row per player and per game)
app --GET /summary--> totals per game, shown on the page of each game
app --POST /report--> relay --> database (the latest report per player and per game, kept 30 days)
```

## What is sent

Only this, never a name, a path, a serial number or an e-mail:

```json
{ "v": 1, "appId": 1125240, "verdict": "works", "app": "0.7.2", "device": "quest", "voter": "<32 hex digits>", "game": "<optional build id>", "offline": false }
```

`verdict` is `works`, `offline_only` (it works, but only without the network: its online or multiplayer part does not) or `fails`.

`offline` is optional and only counts on a vote that says "works": it tells the game worked with GamePort's offline mode on, which the app sets by itself and never when the result could be confused with something else.

`voter` is a random number the app made for itself; it identifies nobody. The relay keeps only a short hash of it (salted with the secret `VOTER_SALT`), so the number the app keeps is never in the database. A player who votes again on the same game replaces their vote. The relay refuses anything that is not exactly this shape, and more than 5 votes a minute from one address (the address is used for that and nothing else). The date kept with a vote is the day, nothing finer.

## Reports

After a player answers "it did not work" or "works offline only", the app sends, by itself when the device has a network, the same report it can save in Downloads: a zip with the versions, the files of the game, its permissions, the log lines of its last runs and of GamePort about it. The app has already removed account numbers, e-mail addresses, network addresses and the account's display name from it. The player can turn the sending off in Settings > Account (the same switch as the votes), and can also send or download the report by hand from the window that follows the answer.

`POST /report?appId=…&app=…&device=…&voter=…` with the zip as the body. The relay checks the same facts as for a vote, that the body is a zip (it starts with `PK`) and at most 1,000,000 bytes, and refuses more than 5 reports a minute from one address. It stores, for each player and game, the latest zip (as base64), its size, the version of GamePort, the kind of device, the hashed voter and the day. A new report from the same player for the same game replaces the old one. **Rows older than 30 days are removed** each time a report arrives.

Only the developer reads them, with the secret `ADMIN_TOKEN` kept in Cloudflare (never in a file), sent as `Authorization: Bearer <token>`:

```
GET /admin/reports          the list: id, appId, app, device, size, day
GET /admin/reports/<id>     the zip
GET /admin/test/reports     the same for the test builds (and /admin/test/reports/<id>)
```

For example: `curl -H "Authorization: Bearer $TOKEN" https://<the relay>/admin/reports/3 -o report-3.zip`. Without the secret set in the relay, or with a wrong token, every one of these answers 404 as if the route did not exist.

## Test routes

`POST /test/vote`, `GET /test/summary` and `POST /test/report` work the same on their own tables (`votes_test`, `reports_test`). The test builds of the app use them, so a test never reaches the real totals or the real reports.

## What is published

`GET /summary` returns the totals per game, and the same totals for each kind of device (a game can work on one and not on another), and nothing about any player:

```json
{ "v": 1, "games": [{ "appId": 1125240, "works": 7, "offlineOnly": 2, "fails": 1, "worksOffline": 3,
  "devices": { "quest": { "works": 6, "offlineOnly": 2, "fails": 0, "worksOffline": 3 }, "pico": { "works": 1, "offlineOnly": 0, "fails": 1, "worksOffline": 0 } } }] }
```

## Setting it up once

From this folder, with Node 20 or later:

1. **Create the database.** `npx wrangler d1 create gameport-votes`. It prints a block with a `database_id`: put that id in `wrangler.toml`, in place of `PASTE-THE-ID-GIVEN-BY-WRANGLER-D1-CREATE`. (Wrangler asks to log in to Cloudflare the first time.)
2. **Create the table.** `npx wrangler d1 execute gameport-votes --remote --file=schema.sql`.
3. **Set the salt**, any long random text, typed when asked and never written in a file: `npx wrangler secret put VOTER_SALT`.
4. **Set the developer's token** for reading the reports, any long random text, typed when asked and never written in a file: `npx wrangler secret put ADMIN_TOKEN`.
5. **Deploy.** `npx wrangler deploy`. The address is `https://gameport-relay.<account subdomain>.workers.dev`; it must contain nothing personal.

A database made earlier needs the migrations run once, in order, from this folder: `npx wrangler d1 execute gameport-votes --remote --file=migrations/0001_offline.sql` (the `offline` column), then `--file=migrations/0002_offline_only.sql` (the answer "offline only"), then `--file=migrations/0003_reports.sql` (the tables of the reports), then `npx wrangler secret put ADMIN_TOKEN` and `npx wrangler deploy`.

Back up the votes at any time with `npx wrangler d1 export gameport-votes --remote --output votes.sql`.

## Tests

`npm test` (Node 22 or later, no dependency). The tests run the relay's real SQL, on SQLite, which is what D1 is. The CI runs them.
