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
{ "v": 1, "appId": 1125240, "verdict": "works", "app": "0.7.2", "device": "quest", "voter": "<32 hex digits>", "game": "<optional build id>", "offline": false, "model": "<optional, Build.MODEL>", "codename": "<optional, Build.DEVICE>" }
```

`verdict` is `works`, `offline_only` (it works, but only without the network: its online or multiplayer part does not) or `fails`.

`offline` is optional and only counts on a vote that says "works": it tells the game worked with GamePort's offline mode on, which the app sets by itself and never when the result could be confused with something else.

`voter` is a random number the app made for itself; it identifies nobody. The relay keeps only a short hash of it (salted with the secret `VOTER_SALT`), so the number the app keeps is never in the database. A player who votes again on the same game replaces their vote. The relay refuses anything that is not exactly this shape, and more than 5 votes a minute from one address (the address is used for that and nothing else). The date kept with a vote is the day, nothing finer.

## Reports

After a player answers "it did not work" or "works offline only", the app sends, by itself when the device has a network, the same report it can save in Downloads: a zip with the versions, the files of the game, its permissions, the log lines of its last runs and of GamePort about it. The app has already removed account numbers, e-mail addresses, network addresses and the account's display name from it. The player can turn the sending off in Settings > Account (the same switch as the votes), and can also send or download the report by hand from the window that follows the answer.

`POST /report?appId=…&app=…&device=…&voter=…` with the zip as the body. The relay checks the same facts as for a vote, that the body is a zip (it starts with `PK`) and at most 2,000,000 bytes (a zip of more than 600,000 bytes is kept in parts of that size, each in a row of its own in `report_parts`, because a row of the database holds 2 MB at most and the zip is stored as base64; a database made earlier needs the two tables of `migrations/0016_report_parts.sql` before the relay that accepts the larger reports is deployed), and refuses more than 5 reports a minute from one address. It stores, for each player and game, the latest zip (as base64), its size, the version of GamePort, the kind of device, the hashed voter and the day. A new report from the same player for the same game replaces the old one. **Rows older than 30 days are removed** each time a report arrives.

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

## The incompatible games

`GET /incompatible` (and `GET /test/incompatible`) returns the table of reasons (a title and an explanation in English and French for each) and the games confirmed as incompatible, each naming one reason: `{"v":1,"reasons":{"anti-tamper":{"title":{"en","fr"},"text":{"en","fr"}}},"games":[{"appId":…,"name":…,"reason":"anti-tamper"}]}`. The app and the site read it, so a game is shown as incompatible (badge, game page, home hidden) as long as it is on the list. The developer edits it in the console: "Incompatibility reasons" is the form that adds or changes a reason (its texts reach every game that names it), and on the page of a game "Mark as incompatible" only asks to pick a reason, nothing is typed per game. "Make compatible" takes the game off, and everyone sees the change at the next refresh (the app within minutes, the site at its next build). Texts are written for any reader, with no semicolon. The migration `migrations/0007_incompatible_reasons.sql` creates the tables of reasons and of games and puts VRChat back with its reason (it replaces 0006, which was run once before; run 0007 next).

"What is new" in the console (a button of the banner, with a badge) shows what came since the last time it was opened: the votes saved since, by game and by answer, and the games that came to Android (read from the catalog by day, with chips for "Since my last visit", "Today" and "Yesterday"). Opening it marks everything as seen. The relay stamps each vote with its own clock when it saves it, UTC, rounded down to the hour (`voted_at`); the app sends no time and no time of a player is used. A vote saved before that column existed has no time, and is told apart by its day. The last visits are kept in the table `console_seen`, not in the browser. **Run `migrations/0009_voted_at.sql` once before deploying this version** (it adds the column and the table, and touches nothing else): `npx wrangler d1 execute gameport-votes --remote --file=migrations/0009_voted_at.sql`. A vote saved in the hour of a visit, after it, is shown at the following visit only.

**Messages to a private Discord channel.** When a vote or a report arrives in production (never the test set), the relay posts one message to the developer's channel: the game (its name from Steam's store, kept an hour), the answer, the device and the version of GamePort, and for a report the player's own answer for that game. The player appears as the short salted hash that the console shows (never the id the app keeps), with the name the developer gave them in the console when there is one, and a link to their page there, so the developer can open them or find them on Discord; no mention is ever parsed. It is sent after the answer to the player, and a failure of Discord changes nothing. The address of the channel's webhook is a secret, never written in a file: `printf '%s' '<the webhook address>' | npx wrangler secret put DISCORD_ADMIN_WEBHOOK`. Without it, nothing is sent. The test set (the `/test` routes, used by the debug builds of the app, and what the console adds in its test mode) has a channel of its own, with the secret `DISCORD_TEST_WEBHOOK` set the same way, and its messages start with [TEST]: the tries of a test build never reach the real channel, and without that secret the test set says nothing.

## Setting it up once

From this folder, with Node 20 or later:

1. **Create the database.** `npx wrangler d1 create gameport-votes`. It prints a block with a `database_id`: put that id in `wrangler.toml`, in place of `PASTE-THE-ID-GIVEN-BY-WRANGLER-D1-CREATE`. (Wrangler asks to log in to Cloudflare the first time.)
2. **Create the table.** `npx wrangler d1 execute gameport-votes --remote --file=schema.sql`.
3. **Set the salt**, any long random text, typed when asked and never written in a file: `npx wrangler secret put VOTER_SALT`.
4. **Set the developer's token** for reading the reports, any long random text, typed when asked and never written in a file: `npx wrangler secret put ADMIN_TOKEN`.
5. **Deploy.** `npx wrangler deploy`. The address is `https://gameport-relay.<account subdomain>.workers.dev`; it must contain nothing personal.

A database made earlier needs the migrations run once, in order, from this folder: `npx wrangler d1 execute gameport-votes --remote --file=migrations/0001_offline.sql` (the `offline` column), then `--file=migrations/0002_offline_only.sql` (the answer "offline only"), then `--file=migrations/0003_reports.sql` (the tables of the reports), then `--file=migrations/0004_fixed.sql` (the columns of the votes marked as fixed), then `npx wrangler secret put ADMIN_TOKEN` and `npx wrangler deploy`.

## The console

A page to see, add, change, mark as fixed and remove the votes, for the real totals and for the test ones, from one place: `https://<the relay>/console`. The address says the set and what is open, so a refresh, a copied link or a bookmark comes back to the same place: `/console/prod`, `/console/test/1125240` (a game), `/console/prod/reports`, `/console/prod/news`, `/console/test/reasons`, and `?voted` for the games with votes only. It is for the developer alone.

- **Who may come in.** Cloudflare Access stands in front of `/console` and lets only the developer's address through (a one-time code sent by e-mail, or a sign-in with an account). The relay does not rely on that alone: every request must carry the signed token Access adds, and the relay checks its signature, its application, its issuer, its end date and the address it was made for. Without the three secrets below, every route of the console answers 404 as if it did not exist.
- **What it does.** Search a game, see its votes (the player as a short hash, the device, the answer, the version of GamePort, the day, and whether it counts), add a vote (it is stored as a vote of its own, with the version `admin`), change any vote, mark one as fixed or count it again, delete one. A vote marked fixed gets the day in `fixed` and, if given, a free text in `fixed_in` (a version of GamePort): it counts as "works" in the totals (its own answer is kept, and comes back when it is counted as it was). The summary lists, for the game, the day and the version of each fix (`fixes`), nothing about the player. A player who votes again for the same game replaces their vote, which counts again.

**Which device exactly.** A vote can carry `model` and `codename`, what the device calls itself (`Build.MODEL`, `Build.DEVICE`: "Quest 3" / "eureka", "SM-S918B" / "dm3q"), next to the kind of device (quest, pico, phone, tablet, other), which stays the family the totals use. Each is a short plain name (letters, digits, space and `. _ + - / ( )`, 40 characters at most); anything else is left out and the vote is saved without it. Never a serial number or a fingerprint. They are stored in the `model` and `codename` columns, replaced when the player votes again, and the summary counts the models for each kind of device: `"models": {"Quest 3": {"works": 2, "offlineOnly": 0, "fails": 1}}`. The names are not stored: the console (and the site, from the summary) turn a code into a name when they show it, with `device_names.js` (the headsets, by hand, because Google's list has none) and `device_names.generated.js` (Google Play's list of supported devices through the MIT project android-device-list, rebuilt with `python3 scripts/update_device_names.py`). A code that is not known is shown as it is. **Run `migrations/0013_model.sql` before deploying this version**; until it is run, votes are still saved without the model.

**What players tick as going wrong.** A vote that says "it did not work" or "works offline only" can carry `issues`, a list of codes from a fixed list: `no_image`, `flat_window`, `closes`, `stuck_loading`, `no_controls`, `no_sound`, `no_online`, `slow`, `no_passthrough`, `visual`, `other`. A code the relay does not know (a newer app) is left out, a vote that says "it worked" keeps none, and anything that is not a list of words is refused. They are stored in the `issues` column of the vote (codes joined by commas), replaced when the player votes again, and counted in the public summary for the game and for each kind of device: `"issues": {"no_sound": 2, "no_controls": 1}` (only when there is something to count, and not for a vote marked as fixed). The site and the app show them as "what players report". **Run `migrations/0011_issues.sql` before deploying this version** (`npx wrangler d1 execute gameport-votes --remote --file=migrations/0011_issues.sql`): it adds one empty column to each table of votes and touches nothing else. Until it is run, votes are still saved (without their ticks) and the summary is as it was, but the console cannot list the votes.
**Players.** The short hash of a player is a link in the console: it opens everything that player sent, their answers on every game (with the device) and their reports, at `/console/<set>/player/<hash>`. There the developer can give the player a name, a Discord name for example, to recognise them: it is kept in two small tables of the relay's database (`player_labels` and `player_labels_test`), shown beside the hash in the votes and the reports, never sent to the app or the site, and never written in the logs. A database made earlier needs `migrations/0015_player_labels.sql` run once, before the relay that reads it is deployed: `npx wrangler d1 execute gameport-votes --remote --file=migrations/0015_player_labels.sql`.

- **Test and production.** A switch at the top, a banner in blue for the test votes and in red for the real ones; the page opens on test, and every change in production asks first.
- **Writes** must come from the page itself (same origin, a header no other site can add, a JSON body), and each change is written in the relay's logs (`console` with the game, the player's hash, before and after).

To set it up, once:

1. `npx wrangler d1 export gameport-votes --remote --output votes.sql` (a copy of the votes, to be safe), then `npx wrangler d1 execute gameport-votes --remote --file=migrations/0004_fixed.sql` (adds two empty columns, `fixed` and `fixed_in`, and touches nothing else).
2. In Cloudflare, Zero Trust, Access, Applications: add a self-hosted application on the relay's address with the path `console`, and a policy that allows only the developer's e-mail address. Note the application's audience tag and the team name.
3. Set the three secrets, typed when asked and never written in a file: `npx wrangler secret put ACCESS_TEAM` (the team name, the part before `.cloudflareaccess.com`), `npx wrangler secret put ACCESS_AUD` (the audience tag), `npx wrangler secret put ADMIN_EMAIL` (the developer's address).
4. `npx wrangler deploy`.

Back up the votes at any time with `npx wrangler d1 export gameport-votes --remote --output votes.sql`.

## Tests

`npm test` (Node 22 or later, no dependency). The tests run the relay's real SQL, on SQLite, which is what D1 is. The CI runs them.
