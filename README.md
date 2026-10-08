# GamePort relay

A small Cloudflare Worker. A player says whether a game worked ("it worked" / "it did not"); the app sends that verdict here; the relay keeps one vote per player and per game in a small database (Cloudflare D1) and publishes the totals. It stores no name, no address and no log of who sent what.

```
app --POST /vote--> relay --> database (one row per player and per game)
app --GET /summary--> totals per game, shown on the page of each game
```

## What is sent

Only this, never a name, a path, a serial number or an e-mail:

```json
{ "v": 1, "appId": 1125240, "verdict": "works", "app": "0.7.2", "device": "quest", "voter": "<32 hex digits>", "game": "<optional build id>", "offline": false }
```

`offline` is optional and only counts on a vote that says "works": it tells the game worked with GamePort's offline mode on, which the app sets by itself and never when the result could be confused with something else.

`voter` is a random number the app made for itself; it identifies nobody. The relay keeps only a short hash of it (salted with the secret `VOTER_SALT`), so the number the app keeps is never in the database. A player who votes again on the same game replaces their vote. The relay refuses anything that is not exactly this shape, and more than 5 votes a minute from one address (the address is used for that and nothing else). The date kept with a vote is the day, nothing finer.

## Test routes

`POST /test/vote` and `GET /test/summary` work the same on their own table (`votes_test`). The test builds of the app use them, so a test never reaches the real totals.

## What is published

`GET /summary` returns the totals per game, and the same totals for each kind of device (a game can work on one and not on another), and nothing about any player:

```json
{ "v": 1, "games": [{ "appId": 1125240, "works": 7, "fails": 1, "worksOffline": 3,
  "devices": { "quest": { "works": 6, "fails": 0, "worksOffline": 3 }, "pico": { "works": 1, "fails": 1, "worksOffline": 0 } } }] }
```

## Setting it up once

From this folder, with Node 20 or later:

1. **Create the database.** `npx wrangler d1 create gameport-votes`. It prints a block with a `database_id`: put that id in `wrangler.toml`, in place of `PASTE-THE-ID-GIVEN-BY-WRANGLER-D1-CREATE`. (Wrangler asks to log in to Cloudflare the first time.)
2. **Create the table.** `npx wrangler d1 execute gameport-votes --remote --file=schema.sql`.
3. **Set the salt**, any long random text, typed when asked and never written in a file: `npx wrangler secret put VOTER_SALT`.
4. **Deploy.** `npx wrangler deploy`. The address is `https://gameport-relay.<account subdomain>.workers.dev`; it must contain nothing personal.

A database made before the `offline` column existed needs it added once: `npx wrangler d1 execute gameport-votes --remote --file=migrations/0001_offline.sql`.

Back up the votes at any time with `npx wrangler d1 export gameport-votes --remote --output votes.sql`.

## Tests

`npm test` (Node 22 or later, no dependency). The tests run the relay's real SQL, on SQLite, which is what D1 is. The CI runs them.
