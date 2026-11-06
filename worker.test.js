import { legacySchema } from "./test_support.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, it } from "node:test";
import { deviceLabel } from "./device_names.js";
import worker, { validate, voterHash } from "./worker.js";

const VOTER = "0123456789abcdef0123456789abcdef";
const OTHER = "fedcba9876543210fedcba9876543210";
const goodMessage = (extra = {}) => ({ v: 1, appId: 1125240, verdict: "works", app: "0.7.2", device: "quest", voter: VOTER, ...extra });
const post = (body, path = "/vote", method = "POST") =>
  new Request(`https://relay.example.invalid${path}`, { method, body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined });
const get = (path = "/summary", method = "GET") => new Request(`https://relay.example.invalid${path}`, { method });

/** The D1 interface (prepare / bind / run / all) over SQLite, which is what D1 is: the tests run the real SQL of the relay. */
function d1(db) {
  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      const all = (args) => ({ results: statement.all(...args).map((row) => ({ ...row })) });
      return {
        bind: (...args) => ({ run: async () => (statement.run(...args), { success: true }), all: async () => all(args) }),
        all: async () => all([]),
        run: async () => (statement.run(), { success: true }),
      };
    },
  };
}

describe("validate", () => {
  it("accepts a good message and keeps only the known fields", () => {
    const { vote, error } = validate({ ...goodMessage({ game: "build-1.2" }), extra: "ignored", ip: "1.2.3.4" });
    assert.equal(error, undefined);
    const { v, ...expected } = goodMessage({ game: "build-1.2" });
    assert.deepEqual(vote, { ...expected, offline: false, issues: [] });
  });

  it("takes the version of an alpha build, which carries its own mark", () => {
    for (const app of ["0.9.1-alpha.2", "0.9.1-alpha.12345"]) assert.equal(validate(goodMessage({ app })).error, undefined, app);
    for (const app of ["0.9.1-alpha", "0.9.1-alpha.", "0.9.1-alpha.x", "0.9.1-alpha.123456", "0.9.1-beta.2"]) assert.ok(validate(goodMessage({ app })).error, app);
  });

  it("refuses everything that is not exactly what the app sends", () => {
    const bad = [
      null, [], "text", 7,
      goodMessage({ v: 2 }), goodMessage({ v: undefined }),
      goodMessage({ appId: 0 }), goodMessage({ appId: -5 }), goodMessage({ appId: 1.5 }), goodMessage({ appId: "1125240" }), goodMessage({ appId: 3_000_000_000 }),
      goodMessage({ verdict: "maybe" }), goodMessage({ verdict: undefined }),
      goodMessage({ app: "0.7" }), goodMessage({ app: "0.7.2-rc1" }), goodMessage({ app: "v0.7.2" }),
      goodMessage({ device: "toaster" }),
      goodMessage({ voter: "short" }), goodMessage({ voter: VOTER.toUpperCase() }), goodMessage({ voter: `${VOTER}0` }),
      goodMessage({ game: "with space" }), goodMessage({ game: "x".repeat(33) }), goodMessage({ game: 12 }),
    ];
    for (const message of bad) assert.ok(validate(message).error, `should refuse ${JSON.stringify(message)}`);
  });

  it("takes \"worked offline\" from a vote that says it worked, and from no other", () => {
    assert.equal(validate(goodMessage({ offline: true })).vote.offline, true);
    assert.equal(validate(goodMessage({ offline: false })).vote.offline, false);
    assert.equal(validate(goodMessage()).vote.offline, false);
    assert.equal(validate(goodMessage({ verdict: "fails", offline: true })).vote.offline, false);
  });

  it("accepts the answer offline only, and keeps the offline flag off it", () => {
    const { vote, error } = validate(goodMessage({ verdict: "offline_only", offline: true }));
    assert.equal(error, undefined);
    assert.equal(vote.verdict, "offline_only");
    assert.equal(vote.offline, false);
  });

  it("refuses an offline flag that is not true or false", () => {
    for (const offline of ["true", 1, 0, null, [], {}]) assert.ok(validate(goodMessage({ offline })).error, `should refuse ${JSON.stringify(offline)}`);
  });

  it("cannot carry a line break or a trick into what is stored", () => {
    for (const game of ["a\nb", "a b", "<script>", "![x](y)", "a=b c=d", "`", "'; DROP TABLE votes; --"]) {
      assert.ok(validate(goodMessage({ game })).error, `should refuse game ${JSON.stringify(game)}`);
    }
  });
});

describe("voterHash", () => {
  it("is short, stable, hides the id and depends on the salt", async () => {
    const a = await voterHash(VOTER, "salt");
    assert.match(a, /^[0-9a-f]{12}$/);
    assert.equal(a, await voterHash(VOTER, "salt"));
    assert.notEqual(a, await voterHash(VOTER, "other salt"));
    assert.notEqual(a, await voterHash(OTHER, "salt"));
    assert.ok(!VOTER.includes(a));
  });
});

describe("the relay", () => {
  let db;
  let env;
  const rows = () => db.prepare("SELECT * FROM votes ORDER BY app_id, voter").all().map((row) => ({ ...row }));

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    env = { DB: d1(db), VOTER_SALT: "salt" };
  });

  it("stores a vote and answers 204, with the day and not a finer date", async () => {
    const response = await worker.fetch(post(goodMessage({ game: "b1" })), env);
    assert.equal(response.status, 204);
    const [row] = rows();
    assert.equal(rows().length, 1);
    assert.equal(row.app_id, 1125240);
    assert.equal(row.verdict, "works");
    assert.equal(row.app, "0.7.2");
    assert.equal(row.game, "b1");
    assert.equal(row.device, "quest");
    assert.match(row.updated, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(row.updated, new Date().toISOString().slice(0, 10));
  });

  it("never stores the raw voter id", async () => {
    await worker.fetch(post(goodMessage()), env);
    const [row] = rows();
    assert.match(row.voter, /^[0-9a-f]{12}$/);
    assert.ok(!JSON.stringify(rows()).includes(VOTER));
  });

  it("keeps one vote per player and per game: voting again replaces the vote", async () => {
    await worker.fetch(post(goodMessage({ verdict: "works" })), env);
    await worker.fetch(post(goodMessage({ verdict: "fails", app: "0.7.3", game: "b2" })), env);
    const stored = rows();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].verdict, "fails");
    assert.equal(stored[0].app, "0.7.3");
    assert.equal(stored[0].game, "b2");
  });

  it("counts two players on a game as two, and one player on two games as two", async () => {
    await worker.fetch(post(goodMessage()), env);
    await worker.fetch(post(goodMessage({ voter: OTHER })), env);
    await worker.fetch(post(goodMessage({ appId: 42 })), env);
    assert.equal(rows().length, 3);
  });

  it("publishes the totals per game and nothing about any player", async () => {
    await worker.fetch(post(goodMessage({ verdict: "works" })), env);
    await worker.fetch(post(goodMessage({ voter: OTHER, verdict: "fails" })), env);
    await worker.fetch(post(goodMessage({ voter: "11111111111111111111111111111111", verdict: "works" })), env);
    await worker.fetch(post(goodMessage({ appId: 42, verdict: "fails" })), env);
    const response = await worker.fetch(get(), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.match(response.headers.get("cache-control"), /max-age=\d+/);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), { v: 1, games: [{ appId: 42, works: 0, offlineOnly: 0, fails: 1, worksOffline: 0, devices: { quest: { works: 0, offlineOnly: 0, fails: 1, worksOffline: 0 } } }, { appId: 1125240, works: 2, offlineOnly: 0, fails: 1, worksOffline: 0, devices: { quest: { works: 2, offlineOnly: 0, fails: 1, worksOffline: 0 } } }] });
    // The kind of device is told on purpose; nothing that could point at a player is.
    for (const secret of [VOTER, OTHER, "0.7.2", "voter", "updated", "11111111111111111111111111111111"]) assert.ok(!text.includes(secret), `the summary must not carry ${secret}`);
  });

  it("stores and counts the games that worked with the offline mode on", async () => {
    await worker.fetch(post(goodMessage({ offline: true })), env);
    await worker.fetch(post(goodMessage({ voter: OTHER, offline: false })), env);
    await worker.fetch(post(goodMessage({ voter: "11111111111111111111111111111111", verdict: "fails", offline: true })), env);
    assert.equal(rows().filter((row) => row.offline === 1).length, 1);
    assert.deepEqual(await (await worker.fetch(get(), env)).json(), { v: 1, games: [{ appId: 1125240, works: 2, offlineOnly: 0, fails: 1, worksOffline: 1, devices: { quest: { works: 2, offlineOnly: 0, fails: 1, worksOffline: 1 } } }] });
  });

  it("counts as worked offline only a vote that says it worked, even if a row says otherwise", async () => {
    db.prepare("INSERT INTO vote_history (app_id, voter, verdict, app, game, device, offline, updated) VALUES (9, 'aaaaaaaaaaaa', 'fails', '0.7.2', NULL, 'quest', 1, '2026-10-08')").run();
    db.prepare("INSERT INTO vote_history (app_id, voter, verdict, app, game, device, offline, updated) VALUES (9, 'bbbbbbbbbbbb', 'works', '0.7.2', NULL, 'quest', 1, '2026-10-08')").run();
    assert.deepEqual(await (await worker.fetch(get(), env)).json(), { v: 1, games: [{ appId: 9, works: 1, offlineOnly: 0, fails: 1, worksOffline: 1, devices: { quest: { works: 1, offlineOnly: 0, fails: 1, worksOffline: 1 } } }] });
  });

  it("a player who votes again without the offline mode replaces the flag", async () => {
    await worker.fetch(post(goodMessage({ offline: true })), env);
    await worker.fetch(post(goodMessage({ offline: false })), env);
    assert.equal(rows()[0].offline, 0);
  });

  it("tells the totals again for each kind of device, since a game that works on one may not on another", async () => {
    await worker.fetch(post(goodMessage({ device: "quest", verdict: "works", offline: true })), env);
    await worker.fetch(post(goodMessage({ voter: OTHER, device: "quest", verdict: "works" })), env);
    await worker.fetch(post(goodMessage({ voter: "11111111111111111111111111111111", device: "pico", verdict: "fails" })), env);
    await worker.fetch(post(goodMessage({ voter: "22222222222222222222222222222222", device: "phone", verdict: "works" })), env);
    assert.deepEqual(await (await worker.fetch(get(), env)).json(), {
      v: 1,
      games: [{
        appId: 1125240, works: 3, offlineOnly: 0, fails: 1, worksOffline: 1,
        devices: {
          phone: { works: 1, offlineOnly: 0, fails: 0, worksOffline: 0 },
          pico: { works: 0, offlineOnly: 0, fails: 1, worksOffline: 0 },
          quest: { works: 2, offlineOnly: 0, fails: 0, worksOffline: 1 },
        },
      }],
    });
  });

  it("accepts the answer \"it works, but only offline\", counts it apart, and never as worked offline", async () => {
    await worker.fetch(post(goodMessage({ verdict: "offline_only", offline: true })), env);
    await worker.fetch(post(goodMessage({ voter: OTHER, verdict: "works" })), env);
    assert.deepEqual(rows().map((row) => [row.verdict, row.offline]).sort(), [["offline_only", 0], ["works", 0]]);
    assert.deepEqual(await (await worker.fetch(get(), env)).json(), {
      v: 1,
      games: [{ appId: 1125240, works: 1, offlineOnly: 1, fails: 0, worksOffline: 0, devices: { quest: { works: 1, offlineOnly: 1, fails: 0, worksOffline: 0 } } }],
    });
  });

  it("a player who changes from works to offline only replaces the vote", async () => {
    await worker.fetch(post(goodMessage({ verdict: "works" })), env);
    await worker.fetch(post(goodMessage({ verdict: "offline_only" })), env);
    assert.deepEqual(rows().map((row) => row.verdict), ["offline_only"]);
  });

  it("publishes an empty list when nobody voted", async () => {
    const response = await worker.fetch(get(), env);
    assert.deepEqual(await response.json(), { v: 1, games: [] });
  });

  it("refuses a bad message and stores nothing", async () => {
    const response = await worker.fetch(post(goodMessage({ verdict: "maybe" })), env);
    assert.equal(response.status, 400);
    assert.equal(rows().length, 0);
  });

  it("refuses what is not json, a body that is too large, another path or another method", async () => {
    assert.equal((await worker.fetch(post("not json"), env)).status, 400);
    assert.equal((await worker.fetch(post(goodMessage({ game: "x".repeat(2000) })), env)).status, 413);
    assert.equal((await worker.fetch(post(goodMessage(), "/other"), env)).status, 404);
    assert.equal((await worker.fetch(get("/vote"), env)).status, 405);
    assert.equal((await worker.fetch(post(goodMessage(), "/summary"), env)).status, 405);
    assert.equal(rows().length, 0);
  });

  it("answers 429 and stores nothing when the limiter says stop, and asks it by address", async () => {
    const seen = [];
    const limiter = { limit: async (options) => (seen.push(options.key), { success: false }) };
    const request = new Request("https://relay.example.invalid/vote", { method: "POST", body: JSON.stringify(goodMessage()), headers: { "CF-Connecting-IP": "203.0.113.9" } });
    const response = await worker.fetch(request, { ...env, LIMITER: limiter });
    assert.equal(response.status, 429);
    assert.deepEqual(seen, ["203.0.113.9"]);
    assert.equal(rows().length, 0);
  });

  it("does not store the address anywhere", async () => {
    const request = new Request("https://relay.example.invalid/vote", { method: "POST", body: JSON.stringify(goodMessage()), headers: { "CF-Connecting-IP": "203.0.113.9" } });
    await worker.fetch(request, env);
    assert.ok(!JSON.stringify(rows()).includes("203.0.113.9"));
  });

  it("the database itself refuses a verdict that is not one of the three", () => {
    assert.throws(() => db.prepare("INSERT INTO vote_history (app_id, voter, verdict, app, game, device, offline, updated) VALUES (1, 'x', 'maybe', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
    assert.doesNotThrow(() => db.prepare("INSERT INTO vote_history (app_id, voter, verdict, app, game, device, offline, updated) VALUES (1, 'x', 'offline_only', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
  });

  it("answers 500 without repeating what the database said, when it fails", async () => {
    const broken = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error("D1_ERROR: secret detail"); } }), all: async () => { throw new Error("D1_ERROR: secret detail"); } }) };
    for (const response of [await worker.fetch(post(goodMessage()), { ...env, DB: broken }), await worker.fetch(get(), { ...env, DB: broken })]) {
      assert.equal(response.status, 500);
      assert.ok(!(await response.text()).includes("secret detail"));
    }
  });

  it("answers 500 when the database is not configured", async () => {
    assert.equal((await worker.fetch(post(goodMessage()), {})).status, 500);
    assert.equal((await worker.fetch(get(), {})).status, 500);
  });
});

describe("the test routes", () => {
  let db;
  let env;
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    env = { DB: d1(db), VOTER_SALT: "salt" };
  });

  it("a vote on /test/vote goes to the test table and never to the real one", async () => {
    assert.equal((await worker.fetch(post(goodMessage(), "/test/vote"), env)).status, 204);
    assert.equal(count("votes_test"), 1);
    assert.equal(count("votes"), 0);
  });

  it("a vote on /vote goes to the real table and never to the test one", async () => {
    assert.equal((await worker.fetch(post(goodMessage()), env)).status, 204);
    assert.equal(count("votes"), 1);
    assert.equal(count("votes_test"), 0);
  });

  it("the two summaries are separate", async () => {
    await worker.fetch(post(goodMessage({ verdict: "works" }), "/test/vote"), env);
    await worker.fetch(post(goodMessage({ appId: 7, verdict: "fails", voter: OTHER })), env);
    assert.deepEqual(await (await worker.fetch(get("/test/summary"), env)).json(), { v: 1, games: [{ appId: 1125240, works: 1, offlineOnly: 0, fails: 0, worksOffline: 0, devices: { quest: { works: 1, offlineOnly: 0, fails: 0, worksOffline: 0 } } }] });
    assert.deepEqual(await (await worker.fetch(get("/summary"), env)).json(), { v: 1, games: [{ appId: 7, works: 0, offlineOnly: 0, fails: 1, worksOffline: 0, devices: { quest: { works: 0, offlineOnly: 0, fails: 1, worksOffline: 0 } } }] });
  });

  it("the test routes check the message and the method as the real ones do", async () => {
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "maybe" }), "/test/vote"), env)).status, 400);
    assert.equal((await worker.fetch(get("/test/vote"), env)).status, 405);
    assert.equal((await worker.fetch(post(goodMessage(), "/test/summary"), env)).status, 405);
    assert.equal((await worker.fetch(post(goodMessage(), "/test/other"), env)).status, 404);
    assert.equal(count("votes_test") + count("votes"), 0);
  });

  it("no path outside the four routes reaches a table, whatever it looks like", async () => {
    for (const path of ["/test", "/test/", "/votes", "/vote/", "//vote", "/test/vote/x", "/__proto__", "/constructor", "/toString"]) {
      assert.equal((await worker.fetch(post(goodMessage(), path), env)).status, 404, path);
    }
    assert.equal(count("votes_test") + count("votes"), 0);
  });
});

describe("the migration of a database made before the offline column", () => {
  it("adds the column to both tables, keeps the votes, and counts them as not offline", async () => {
    const db = new DatabaseSync(":memory:");
    const old = legacySchema.replaceAll(/^\s*offline INTEGER.*\n/gm, "").replaceAll(/^\s*fixed(_in)? +TEXT.*\n/gm, "").replaceAll(/^\s*voted_at +TEXT.*\n/gm, "").replaceAll(/^\s*issues +TEXT.*\n/gm, "").replaceAll("'works', 'offline_only', 'fails'", "'works', 'fails'");
    assert.ok(!old.includes("offline") && !old.includes("fixed") && !old.includes("voted_at"));
    db.exec(old);
    db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, updated) VALUES (1, 'aaaaaaaaaaaa', 'works', '0.7.2', NULL, 'quest', '2026-10-08')").run();
    db.exec(readFileSync(new URL("./migrations/0001_offline.sql", import.meta.url), "utf8"));
    db.exec(readFileSync(new URL("./migrations/0004_fixed.sql", import.meta.url), "utf8"));
    db.exec(readFileSync(new URL("./migrations/0009_voted_at.sql", import.meta.url), "utf8"));
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    assert.deepEqual(await (await worker.fetch(get(), env)).json(), { v: 1, games: [{ appId: 1, works: 1, offlineOnly: 0, fails: 0, worksOffline: 0, devices: { quest: { works: 1, offlineOnly: 0, fails: 0, worksOffline: 0 } } }] });
    assert.equal((await worker.fetch(post(goodMessage({ offline: true }), "/test/vote"), env)).status, 204);
    assert.deepEqual(await (await worker.fetch(get("/test/summary"), env)).json(), { v: 1, games: [{ appId: 1125240, works: 1, offlineOnly: 0, fails: 0, worksOffline: 1, devices: { quest: { works: 1, offlineOnly: 0, fails: 0, worksOffline: 1 } } }] });
  });
});

describe("the migration that allows the answer offline only", () => {
  it("rebuilds both tables, keeps every vote, and then accepts the new answer and still refuses the others", async () => {
    const db = new DatabaseSync(":memory:");
    // The database as it was after the offline column, before the third answer.
    const schema = legacySchema.replaceAll(/^\s*fixed(_in)? +TEXT.*\n/gm, "").replaceAll(/^\s*voted_at +TEXT.*\n/gm, "").replaceAll(/^\s*issues +TEXT.*\n/gm, "").replaceAll("'works', 'offline_only', 'fails'", "'works', 'fails'");
    assert.ok(!schema.includes("offline_only") && !schema.includes("fixed") && !schema.includes("voted_at"));
    db.exec(schema);
    db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (1, 'aaaaaaaaaaaa', 'works', '0.7.2', 'b1', 'quest', 1, '2026-10-08')").run();
    db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (1, 'bbbbbbbbbbbb', 'fails', '0.7.2', NULL, 'pico', 0, '2026-10-08')").run();
    db.prepare("INSERT INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated) VALUES (2, 'cccccccccccc', 'works', '0.7.2', NULL, 'phone', 0, '2026-10-08')").run();
    assert.throws(() => db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (1, 'x', 'offline_only', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
    db.exec(readFileSync(new URL("./migrations/0002_offline_only.sql", import.meta.url), "utf8"));
    db.exec(readFileSync(new URL("./migrations/0004_fixed.sql", import.meta.url), "utf8"));
    db.exec(readFileSync(new URL("./migrations/0009_voted_at.sql", import.meta.url), "utf8"));
    assert.deepEqual(db.prepare("SELECT * FROM votes ORDER BY voter").all().map((row) => ({ ...row })), [
      { app_id: 1, voter: "aaaaaaaaaaaa", verdict: "works", app: "0.7.2", game: "b1", device: "quest", offline: 1, updated: "2026-10-08", fixed: null, fixed_in: null, voted_at: null },
      { app_id: 1, voter: "bbbbbbbbbbbb", verdict: "fails", app: "0.7.2", game: null, device: "pico", offline: 0, updated: "2026-10-08", fixed: null, fixed_in: null, voted_at: null },
    ]);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes_test").get().n, 1);
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "offline_only" })), env)).status, 204);
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "offline_only" }), "/test/vote"), env)).status, 204);
    assert.throws(() => db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (9, 'x', 'maybe', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
    // Voting again still replaces: the key of the table is kept.
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "works" })), env)).status, 204);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes WHERE app_id = 1125240").get().n, 1);
  });
});


describe("the reports", () => {
  let db;
  let env;
  const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
  const query = (extra = {}) => new URLSearchParams({ appId: "846470", app: "0.7.4", device: "quest", voter: VOTER, ...extra }).toString();
  const send = (body = ZIP, path = "/report", extra = {}, method = "POST") =>
    new Request(`https://relay.example.invalid${path}?${query(extra)}`, { method, body: method === "POST" ? body : undefined });
  const read = (path, token) => new Request(`https://relay.example.invalid${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    env = { DB: d1(db), VOTER_SALT: "salt", ADMIN_TOKEN: "the-developer-token" };
  });

  it("stores a report, with the day and the size, and the zip as it came", async () => {
    assert.equal((await worker.fetch(send(), env)).status, 204);
    const row = db.prepare("SELECT * FROM reports").get();
    assert.equal(row.app_id, 846470);
    assert.equal(row.app, "0.7.4");
    assert.equal(row.device, "quest");
    assert.equal(row.size, ZIP.length);
    assert.equal(row.updated, new Date().toISOString().slice(0, 10));
    assert.deepEqual([...Buffer.from(row.data, "base64")], [...ZIP]);
    assert.equal(count("votes"), 0);
  });

  it("keeps the Discord name once per player, cleaned, and an empty name takes it away", async () => {
    const give = (discord) => worker.fetch(post(goodMessage(discord === undefined ? {} : { discord })), env);
    const kept = () => db.prepare("SELECT discord FROM player_contacts").all().map((row) => row.discord);
    assert.equal((await give("  @Some.Name<b> ")).status, 204);
    assert.deepEqual(kept(), ["Some.Nameb"]);
    // A name that is too long is cut; neither it nor a bad one is ever a reason to lose the answer.
    assert.equal((await give("x".repeat(80))).status, 204);
    assert.deepEqual(kept(), ["x".repeat(40)]);
    // An app that says nothing about it leaves what was kept.
    assert.equal((await give(undefined)).status, 204);
    assert.deepEqual(kept(), ["x".repeat(40)]);
    // One that holds only what is cleaned away, or nothing, takes the name away.
    assert.equal((await give(" @<> ")).status, 204);
    assert.deepEqual(kept(), []);
    assert.equal((await give("kept.name")).status, 204);
    assert.equal((await give("")).status, 204);
    assert.deepEqual(kept(), []);
    // Nothing of it reaches the votes.
    assert.throws(() => db.prepare("SELECT discord FROM votes").all());
  });

  it("never stores the raw voter id, nor the address", async () => {
    await worker.fetch(new Request(`https://relay.example.invalid/report?${query()}`, { method: "POST", body: ZIP, headers: { "CF-Connecting-IP": "203.0.113.9" } }), env);
    const row = db.prepare("SELECT * FROM reports").get();
    assert.match(row.voter, /^[0-9a-f]{12}$/);
    const text = JSON.stringify({ ...row, data: "" });
    assert.ok(!text.includes(VOTER));
    assert.ok(!text.includes("203.0.113.9"));
  });

  it("refuses what is not a zip, a zip that is too large, and facts that are not as expected", async () => {
    assert.equal((await worker.fetch(send(new Uint8Array([1, 2, 3, 4, 5, 6])), env)).status, 400);
    assert.equal((await worker.fetch(send(new Uint8Array(0)), env)).status, 400);
    const big = new Uint8Array(2_000_001);
    big.set([0x50, 0x4b, 0x03, 0x04]);
    assert.equal((await worker.fetch(send(big), env)).status, 413);
    for (const extra of [{ appId: "0" }, { appId: "abc" }, { app: "0.7" }, { device: "toaster" }, { voter: "short" }, { voter: VOTER.toUpperCase() }]) {
      assert.equal((await worker.fetch(send(ZIP, "/report", extra), env)).status, 400, JSON.stringify(extra));
    }
    assert.equal((await worker.fetch(send(ZIP, "/report", {}, "GET"), env)).status, 405);
    assert.equal(count("reports"), 0);
  });

  it("keeps one report per player and per game: a new one replaces the old", async () => {
    await worker.fetch(send(ZIP), env);
    const newer = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9]);
    await worker.fetch(send(newer, "/report", { app: "0.7.5" }), env);
    assert.equal(count("reports"), 1);
    const row = db.prepare("SELECT * FROM reports").get();
    assert.equal(row.app, "0.7.5");
    assert.deepEqual([...Buffer.from(row.data, "base64")], [...newer]);
    await worker.fetch(send(ZIP, "/report", { voter: OTHER }), env);
    await worker.fetch(send(ZIP, "/report", { appId: "42" }), env);
    assert.equal(count("reports"), 3);
  });

  describe("a report of up to 2 MB, cut into parts", () => {
    // A zip of the given size that is not all one byte, so a part put in the wrong place would show.
    const zipOf = (size) => {
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) bytes[i] = (i * 31 + (i >> 8)) & 255;
      bytes.set([0x50, 0x4b, 0x03, 0x04]);
      return bytes;
    };
    const parts = (table = "report_parts") => db.prepare(`SELECT report_id, seq, length(data) AS n FROM ${table} ORDER BY report_id, seq`).all().map((row) => ({ ...row }));
    const download = async (id) => Buffer.from(await (await worker.fetch(read(`/admin/reports/${id}`, "the-developer-token"), env)).arrayBuffer());

    it("takes a zip of exactly 2 000 000 bytes and refuses one more byte", async () => {
      assert.equal((await worker.fetch(send(zipOf(2_000_000)), env)).status, 204);
      assert.equal((await worker.fetch(send(zipOf(2_000_001), "/report", { appId: "42" }), env)).status, 413);
      assert.equal(count("reports"), 1);
    });

    it("keeps a large report in parts of at most 600 000 bytes, no row near the limit of the database, and gives it back byte for byte", async () => {
      const zip = zipOf(1_900_000);
      assert.equal((await worker.fetch(send(zip), env)).status, 204);
      const row = db.prepare("SELECT id, size, data FROM reports").get();
      assert.equal(row.size, 1_900_000);
      assert.equal(row.data, "");
      const stored = parts();
      assert.equal(stored.length, 4);
      assert.ok(stored.every((part) => part.report_id === row.id && part.n <= 800_000));
      assert.deepEqual(stored.map((part) => part.seq), [0, 1, 2, 3]);
      assert.deepEqual(await download(row.id), Buffer.from(zip));
    });

    it("keeps a small report whole in its row, as before, with no part", async () => {
      assert.equal((await worker.fetch(send(zipOf(600_000)), env)).status, 204);
      assert.notEqual(db.prepare("SELECT data FROM reports").get().data, "");
      assert.deepEqual(parts(), []);
    });

    it("forgets the parts of a report that a new one replaces, whether the new one is small or large", async () => {
      await worker.fetch(send(zipOf(1_500_000)), env);
      const id = db.prepare("SELECT id FROM reports").get().id;
      assert.equal(parts().length, 3);
      await worker.fetch(send(zipOf(700_000), "/report", { app: "0.7.5" }), env);
      assert.equal(parts().length, 2);
      assert.deepEqual(await download(id), Buffer.from(zipOf(700_000)));
      await worker.fetch(send(ZIP, "/report", { app: "0.7.6" }), env);
      assert.deepEqual(parts(), []);
      assert.deepEqual([...await download(id)], [...ZIP]);
      assert.equal(count("reports"), 1);
    });

    it("removes the parts of the reports it forgets after 30 days", async () => {
      await worker.fetch(send(zipOf(1_300_000), "/report", { appId: "42" }), env);
      db.prepare("UPDATE reports SET updated = '2000-01-01'").run();
      await worker.fetch(send(ZIP), env);
      assert.equal(count("reports"), 1);
      assert.deepEqual(parts(), []);
    });

    it("keeps the test builds' parts in their own table", async () => {
      assert.equal((await worker.fetch(send(zipOf(1_300_000), "/test/report"), env)).status, 204);
      assert.equal(parts().length, 0);
      assert.equal(parts("report_parts_test").length, 3);
      const id = db.prepare("SELECT id FROM reports_test").get().id;
      const zip = await worker.fetch(read(`/admin/test/reports/${id}`, "the-developer-token"), env);
      assert.deepEqual(Buffer.from(await zip.arrayBuffer()), Buffer.from(zipOf(1_300_000)));
    });

    it("still takes a small report on a database that has not had the migration, and does not keep half of a large one", async () => {
      db.exec("DROP TABLE report_parts; DROP TABLE report_parts_test;");
      assert.equal((await worker.fetch(send(ZIP), env)).status, 204);
      assert.equal((await worker.fetch(send(zipOf(1_300_000), "/report", { appId: "42" }), env)).status, 500);
      assert.equal(count("reports"), 1);
    });

    it("gives a report that was stored whole before the parts existed", async () => {
      db.prepare("INSERT INTO reports (app_id, voter, app, device, size, data, updated) VALUES (7, 'aaaaaaaaaaaa', '0.7.4', 'quest', ?, ?, '2026-10-01')").run(ZIP.length, Buffer.from(ZIP).toString("base64"));
      const id = db.prepare("SELECT id FROM reports").get().id;
      assert.deepEqual([...await download(id)], [...ZIP]);
    });
  });

  it("keeps the test builds in their own table", async () => {
    assert.equal((await worker.fetch(send(ZIP, "/test/report"), env)).status, 204);
    assert.equal(count("reports_test"), 1);
    assert.equal(count("reports"), 0);
  });

  it("removes the reports older than 30 days when a new one arrives", async () => {
    const insert = db.prepare("INSERT INTO reports (app_id, voter, app, device, size, data, updated) VALUES (?, ?, '0.7.3', 'quest', 4, 'UEsDBA==', ?)");
    const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    insert.run(1, "aaaaaaaaaaaa", daysAgo(45));
    insert.run(2, "bbbbbbbbbbbb", daysAgo(10));
    await worker.fetch(send(ZIP), env);
    assert.deepEqual(db.prepare("SELECT app_id FROM reports ORDER BY app_id").all().map((r) => r.app_id), [2, 846470]);
  });

  it("answers 429 and stores nothing when the limiter says stop, with a key of its own", async () => {
    const seen = [];
    const limiter = { limit: async (options) => (seen.push(options.key), { success: false }) };
    const request = new Request(`https://relay.example.invalid/report?${query()}`, { method: "POST", body: ZIP, headers: { "CF-Connecting-IP": "203.0.113.9" } });
    assert.equal((await worker.fetch(request, { ...env, LIMITER: limiter })).status, 429);
    assert.deepEqual(seen, ["report:203.0.113.9"]);
    assert.equal(count("reports"), 0);
  });

  it("answers 500 without repeating what the database said", async () => {
    const broken = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error("D1_ERROR: secret detail"); } }) }) };
    const response = await worker.fetch(send(), { ...env, DB: broken });
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes("secret detail"));
  });

  it("lists the reports and gives one back, for the developer's token and nobody else", async () => {
    await worker.fetch(send(), env);
    const listed = await worker.fetch(read("/admin/reports", "the-developer-token"), env);
    assert.equal(listed.status, 200);
    const { reports } = await listed.json();
    assert.equal(reports.length, 1);
    assert.deepEqual(Object.keys(reports[0]).sort(), ["app", "appId", "device", "id", "size", "updated"]);
    const zip = await worker.fetch(read(`/admin/reports/${reports[0].id}`, "the-developer-token"), env);
    assert.equal(zip.status, 200);
    assert.equal(zip.headers.get("content-type"), "application/zip");
    assert.deepEqual([...new Uint8Array(await zip.arrayBuffer())], [...ZIP]);
  });

  it("shows nothing without the token, with a wrong one, or when the relay has no token", async () => {
    await worker.fetch(send(), env);
    for (const request of [read("/admin/reports"), read("/admin/reports", "wrong"), read("/admin/reports/1"), read("/admin/reports/1", "wrong")]) {
      assert.equal((await worker.fetch(request, env)).status, 404);
    }
    const noToken = { ...env, ADMIN_TOKEN: undefined };
    assert.equal((await worker.fetch(read("/admin/reports", "undefined"), noToken)).status, 404);
    assert.equal((await worker.fetch(read("/admin/reports", ""), noToken)).status, 404);
  });

  it("reads the test table on its own route, and refuses an id that is not a number or not there", async () => {
    await worker.fetch(send(ZIP, "/test/report"), env);
    assert.equal((await (await worker.fetch(read("/admin/reports", "the-developer-token"), env)).json()).reports.length, 0);
    assert.equal((await (await worker.fetch(read("/admin/test/reports", "the-developer-token"), env)).json()).reports.length, 1);
    for (const path of ["/admin/reports/abc", "/admin/reports/999", "/admin/reports/1/2", "/admin/reportsx"]) {
      assert.equal((await worker.fetch(read(path, "the-developer-token"), env)).status, 404, path);
    }
    assert.equal((await worker.fetch(new Request("https://relay.example.invalid/admin/reports", { method: "POST", headers: { authorization: "Bearer the-developer-token" } }), env)).status, 405);
  });
});

describe("the messages to the developer's private channel", () => {
  const HOOK = "https://discord.com/api/webhooks/123456789/token-abc_DEF";
  const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  let db;
  let env;
  let sent;
  let waiting;
  let realFetch;
  const ctx = { waitUntil: (promise) => waiting.push(promise) };
  const run = async (request) => {
    const response = await worker.fetch(request, env, ctx);
    await Promise.all(waiting);
    return response;
  };
  const report = (extra = {}) => new Request(`https://relay.example.invalid/report?${new URLSearchParams({ appId: "846470", app: "0.7.4", device: "pico", voter: VOTER, ...extra })}`, { method: "POST", body: ZIP });

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    env = { DB: d1(db), VOTER_SALT: "salt", DISCORD_ADMIN_WEBHOOK: HOOK };
    sent = [];
    waiting = [];
    realFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith("https://store.steampowered.com/")) return new Response(JSON.stringify({ 846470: { success: true, data: { name: "A Game" } }, 5219700: { success: true, data: { name: "A Demo" } } }));
      if (String(url).startsWith("https://raw.githubusercontent.com/")) return new Response(JSON.stringify({ apps: [{ appid: 885000, name: "Name In The Catalog" }, { appid: 5219700, parent: 3456660, cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5219700/abc123/library_capsule.jpg", header: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/5219700/def456/header.jpg" }] }));
      // Steam serves pictures for every app but the demo, whose own pictures are missing: the full game's stand in.
      if (options?.method === "HEAD") return new Response(null, { status: String(url).includes("/5219700/") ? 404 : 200 });
      sent.push({ url: String(url), body: JSON.parse(options.body) });
      return new Response(null, { status: 204 });
    };
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  it("tells a real vote with the game, the answer, the device and the player's short code, never the id the app keeps", async () => {
    assert.equal((await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "pico" })))).status, 204);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, HOOK);
    const embed = sent[0].body.embeds[0];
    const hash = rowsOf(db)[0].voter;
    assert.match(embed.title, /A Game/);
    assert.deepEqual(embed.fields.slice(0, 2).map((f) => f.value), ["Does not work", "Pico"]);
    assert.equal(embed.fields.find((f) => f.name === "Player").value, hash);
    assert.ok(embed.description.includes(`[Player](https://relay.example.invalid/console/prod/player/${hash})`), embed.description);
    assert.deepEqual(sent[0].body.allowed_mentions, { parse: [] });
    assert.ok(!JSON.stringify(sent).includes(VOTER));
  });

  it("tells what became of the report with the answer, in words, and nothing when the answer has no state", async () => {
    await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "pico", report: "none" })));
    assert.match(sent[0].body.embeds[0].fields.find((f) => f.name === "Report").value, /^None \(the game is not installed, or the report is too large\)$/);
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "pico", report: "sent" })));
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Report").value, "Sent");
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "pico" })));
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Report"), undefined);
  });

  it("shows the name the developer gave the player, with the code, in a vote and in a report", async () => {
    await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "pico" })));
    const hash = rowsOf(db)[0].voter;
    db.prepare("INSERT INTO player_labels (voter, label, updated) VALUES (?, 'Some Tester [Team]', '2026-10-27')").run(hash);
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "pico" })));
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Player").value, `Some Tester [Team] (${hash})`);
    sent.length = 0;
    await run(report());
    const embed = sent[0].body.embeds[0];
    assert.match(embed.title, /New report/);
    assert.equal(embed.fields.find((f) => f.name === "Player").value, `Some Tester [Team] (${hash})`);
    assert.ok(embed.description.includes(`/console/prod/player/${hash}`));
    assert.ok(!JSON.stringify(sent).includes(VOTER));
  });

  it("tells a report with the answer the app gives with it, not the one stored before it", async () => {
    await run(post(goodMessage({ appId: 846470, verdict: "works", device: "pico" })));
    sent.length = 0;
    await run(report({ answer: "fails" }));
    assert.match(sent[0].body.embeds[0].title, /New report/);
    assert.match(sent[0].body.content ?? sent[0].body.embeds[0].title, /Does not work/);
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Player's answer").value, "Does not work");
    // Without it, or with a word that is not an answer, the stored one is told, and the report is never refused for it.
    sent.length = 0;
    assert.equal((await run(report())).status, 204);
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Player's answer").value, "Works");
    sent.length = 0;
    assert.equal((await run(report({ answer: "maybe" }))).status, 204);
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Player's answer").value, "Works");
  });

  it("names a player of the test set from the test names only, and still tells the code when the table of names is not there yet", async () => {
    const TEST_HOOK = "https://discord.com/api/webhooks/987654321/test-token_XYZ";
    env.DISCORD_TEST_WEBHOOK = TEST_HOOK;
    await run(post(goodMessage({ appId: 846470 }), "/test/vote"));
    const hash = db.prepare("SELECT voter FROM votes_test").get().voter;
    db.prepare("INSERT INTO player_labels (voter, label, updated) VALUES (?, 'Real set name', '2026-10-27')").run(hash);
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470 }), "/test/vote"));
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Player").value, hash);
    assert.ok(sent[0].body.embeds[0].description.includes(`/console/test/player/${hash}`));
    db.exec("DROP TABLE player_labels; DROP TABLE player_labels_test;");
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470, verdict: "fails" })));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body.embeds[0].fields.find((f) => f.name === "Player").value, rowsOf(db)[0].voter);
  });

  it("names the exact device in the channel's message when the model is known, and the kind of device when it is not", async () => {
    await run(post(goodMessage({ appId: 846470, verdict: "fails", device: "quest", model: "Quest 3" })));
    assert.equal(sent.at(-1).body.embeds[0].fields.find((f) => f.name === "Device").value, "Meta Quest 3");
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470, verdict: "works", device: "pico" })));
    assert.equal(sent.at(-1).body.embeds[0].fields.find((f) => f.name === "Device").value, "Pico");
  });

  it("names a game from the catalog when Steam's store has nothing for it, as the console does, and keeps the number for a game nobody knows", async () => {
    assert.equal((await run(post(goodMessage({ appId: 885000, verdict: "works" })))).status, 204);
    assert.match(sent.at(-1).body.embeds[0].title, /^New vote: Name In The Catalog$/);
    sent.length = 0;
    assert.equal((await run(post(goodMessage({ appId: 2091960, verdict: "works" })))).status, 204);
    assert.match(sent.at(-1).body.embeds[0].title, /^New vote: App 2091960$/);
  });

  it("does not tell a vote of the test set, and the player's answer is the same without a channel", async () => {
    assert.equal((await run(post(goodMessage(), "/test/vote"))).status, 204);
    assert.equal(sent.length, 0);
    delete env.DISCORD_ADMIN_WEBHOOK;
    assert.equal((await run(post(goodMessage()))).status, 204);
    assert.equal(sent.length, 0);
  });

  it("tells the test set to its own channel, marked as a test, and never to the real one", async () => {
    const TEST_HOOK = "https://discord.com/api/webhooks/987654321/test-token_XYZ";
    env.DISCORD_TEST_WEBHOOK = TEST_HOOK;
    assert.equal((await run(post(goodMessage({ appId: 846470, verdict: "works" }), "/test/vote"))).status, 204);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, TEST_HOOK);
    const embed = sent[0].body.embeds[0];
    assert.match(embed.title, /^\[TEST\] New vote: A Game/);
    assert.ok(!embed.url.endsWith("/prod"), embed.url);
    sent.length = 0;
    assert.equal((await run(post(goodMessage({ appId: 846470, verdict: "fails" })))).status, 204);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, HOOK);
    assert.ok(!sent[0].body.embeds[0].title.startsWith("[TEST]"));
    // A report of the test set goes to the test channel too, with the download of the test set.
    sent.length = 0;
    await run(new Request(`https://relay.example.invalid/test/report?${new URLSearchParams({ appId: "846470", app: "0.7.4", device: "pico", voter: VOTER })}`, { method: "POST", body: ZIP }));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, TEST_HOOK);
    assert.match(sent[0].body.embeds[0].description, /report\?env=test&id=/);
  });

  it("tells nothing for the test set when it has no channel of its own, even if the real one is set", async () => {
    assert.equal((await run(post(goodMessage(), "/test/vote"))).status, 204);
    assert.equal(sent.length, 0);
  });

  it("ignores an address that is not a Discord webhook", async () => {
    env.DISCORD_ADMIN_WEBHOOK = "https://evil.example.invalid/api/webhooks/1/x";
    assert.equal((await run(post(goodMessage()))).status, 204);
    assert.equal(sent.length, 0);
  });

  it("saves the vote and answers 204 even when Discord fails", async () => {
    globalThis.fetch = async () => { throw new Error("down"); };
    assert.equal((await run(post(goodMessage()))).status, 204);
    assert.equal(rowsOf(db).length, 1);
  });

  it("shows a demo's cover the way the app does, the full game's when the demo has none, and opens the console on the game in its set", async () => {
    await run(post(goodMessage({ appId: 5219700, verdict: "works" })));
    const embed = sent[0].body.embeds[0];
    assert.match(embed.title, /A Demo/);
    assert.match(embed.thumbnail.url, /\/3456660\/library_600x900\.jpg$/);
    assert.equal(embed.url, "https://relay.example.invalid/console/prod/5219700");
  });

  it("lists what the player ticked as going wrong, in words, one a line", async () => {
    await run(post(goodMessage({ appId: 846470, verdict: "fails", issues: ["no_controls", "no_sound"] })));
    const field = sent[0].body.embeds[0].fields.find((f) => f.name === "Problems");
    assert.equal(field.value, "• Controls missing or wrong\n• No sound");
    assert.equal(field.inline, false);
    sent.length = 0;
    await run(post(goodMessage({ appId: 846470, verdict: "fails", voter: OTHER })));
    assert.equal(sent[0].body.embeds[0].fields.some((f) => f.name === "Problems"), false);
  });

  it("tells a real report with the player's own answer for that game, and not a report of the test set", async () => {
    await run(post(goodMessage({ appId: 846470, verdict: "offline_only" })));
    sent.length = 0;
    assert.equal((await run(report())).status, 204);
    assert.equal(sent.length, 1);
    const embed = sent[0].body.embeds[0];
    assert.match(embed.title, /A Game/);
    assert.deepEqual(embed.fields.slice(0, 2).map((f) => f.value), ["Works offline only", "Pico"]);
    const id = db.prepare("SELECT id FROM reports").get().id;
    assert.match(embed.description, new RegExp(`\\[Download the report\\]\\(https://relay.example.invalid/console/api/report\\?env=prod&id=${id}\\)`));
    assert.match(embed.description, /store\.steampowered\.com\/app\/846470/);
    assert.match(embed.thumbnail.url, /\/846470\/library_600x900\.jpg$/);
    sent.length = 0;
    await run(new Request(`https://relay.example.invalid/test/report?${new URLSearchParams({ appId: "846470", app: "0.7.4", device: "pico", voter: VOTER })}`, { method: "POST", body: ZIP }));
    assert.equal(sent.length, 0);
  });

  it("says the report has no vote when the player gave none", async () => {
    await run(report());
    assert.equal(sent[0].body.embeds[0].fields[0].value, "No vote");
  });
});

function rowsOf(db) {
  return db.prepare("SELECT * FROM votes").all().map((row) => ({ ...row }));
}

describe("what players tick as going wrong", () => {
  let db;
  let env;
  const summary = async () => (await (await worker.fetch(get(), env)).json()).games;
  const voteWith = (voter, extra) => worker.fetch(post(goodMessage({ voter, ...extra })), env);

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    env = { DB: d1(db), VOTER_SALT: "salt" };
  });

  it("keeps the known codes, in the order of the list, and leaves out the ones it does not know", () => {
    assert.deepEqual(validate(goodMessage({ verdict: "fails", issues: ["slow", "no_sound", "from_the_future", "slow"] })).vote.issues, ["no_sound", "slow"]);
    assert.deepEqual(validate(goodMessage({ verdict: "fails" })).vote.issues, []);
  });

  it("keeps none for an answer that says it worked, and refuses what is not a list of words", () => {
    assert.deepEqual(validate(goodMessage({ verdict: "works", issues: ["no_sound"] })).vote.issues, []);
    for (const bad of ["no_sound", { 0: "no_sound" }, [1, 2], [null], Array(33).fill("slow")]) {
      assert.ok(validate(goodMessage({ verdict: "fails", issues: bad })).error, `should refuse ${JSON.stringify(bad)}`);
    }
  });

  it("stores them with the vote, and the summary counts them for the game and for the kind of device", async () => {
    assert.equal((await voteWith(VOTER, { verdict: "fails", device: "pico", issues: ["no_sound", "no_controls"] })).status, 204);
    assert.equal((await voteWith(OTHER, { verdict: "fails", device: "pico", issues: ["no_sound"] })).status, 204);
    assert.equal((await voteWith("1".repeat(32), { verdict: "offline_only", device: "quest", issues: ["no_online"] })).status, 204);
    const [game] = await summary();
    assert.deepEqual(game.issues, { no_controls: 1, no_sound: 2, no_online: 1 });
    assert.deepEqual(game.devices.pico.issues, { no_controls: 1, no_sound: 2 });
    assert.deepEqual(game.devices.quest.issues, { no_online: 1 });
  });

  it("says nothing when nobody ticked anything, so the summary is what it was", async () => {
    await voteWith(VOTER, { verdict: "fails" });
    const [game] = await summary();
    assert.equal("issues" in game, false);
    assert.equal("issues" in game.devices.quest, false);
  });

  it("replaces them when the same player votes again, and does not count a vote that is marked as fixed", async () => {
    await voteWith(VOTER, { verdict: "fails", issues: ["slow"] });
    await voteWith(VOTER, { verdict: "fails", issues: ["closes"] });
    assert.deepEqual((await summary())[0].issues, { closes: 1 });
    db.prepare("UPDATE vote_history SET fixed = '2026-10-26'").run();
    assert.equal("issues" in (await summary())[0], false);
  });

  it("still saves the vote on a database that has not had the migration yet, without the ticks", async () => {
    const old = new DatabaseSync(":memory:");
    old.exec(legacySchema.replaceAll(/^\s*issues +TEXT.*\n/gm, ""));
    assert.ok(!old.prepare("SELECT sql FROM sqlite_master WHERE name = 'votes'").get().sql.includes("issues"));
    const oldEnv = { DB: d1(old), VOTER_SALT: "salt" };
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails", issues: ["slow"] })), oldEnv)).status, 204);
    const body = await (await worker.fetch(get(), oldEnv)).json();
    assert.equal(body.games[0].fails, 1);
    assert.equal("issues" in body.games[0], false);
    // The migration adds the column, and the ticks are kept from then on.
    old.exec(readFileSync(new URL("./migrations/0011_issues.sql", import.meta.url), "utf8"));
    await worker.fetch(post(goodMessage({ voter: OTHER, verdict: "fails", issues: ["slow"] })), oldEnv);
    assert.deepEqual((await (await worker.fetch(get(), oldEnv)).json()).games[0].issues, { slow: 1 });
  });
});

describe("the model and the codename of a device", () => {
  it("keeps a plain model and codename, leaves out what is not a plain name, and never refuses the vote for it", () => {
    const { vote, error } = validate(goodMessage({ model: " Quest 3 ", codename: "eureka" }));
    assert.equal(error, undefined);
    assert.equal(vote.model, "Quest 3");
    assert.equal(vote.codename, "eureka");
    for (const bad of ["", "x".repeat(41), "a<script>", "line\nbreak", 7, null, "é"]) {
      const checked = validate(goodMessage({ model: bad, codename: bad }));
      assert.equal(checked.error, undefined, JSON.stringify(bad));
      assert.equal("model" in checked.vote, false);
      assert.equal("codename" in checked.vote, false);
    }
    assert.equal("model" in validate(goodMessage()).vote, false);
  });

  const stripped = (...columns) => columns.reduce((sql, column) => sql.replaceAll(new RegExp(`^\\s*${column} +TEXT.*\\n`, "gm"), ""), legacySchema);
  const summaryOf = async (env) => (await (await worker.fetch(get(), env)).json()).games;
  const reportsOf = async (env, path = "/reports/1125240") => (await (await worker.fetch(get(path), env)).json()).reports;

  it("stores them with the vote, replaces them when the player votes again, and the summary counts the models for each kind of device", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    const vote = (voter, extra) => worker.fetch(post(goodMessage({ voter, ...extra })), env);
    await vote(VOTER, { verdict: "fails", device: "pico", model: "A8110", codename: "phoenix" });
    await vote(OTHER, { verdict: "works", device: "pico", model: "A8110" });
    await vote("1".repeat(32), { verdict: "works", device: "quest", model: "Quest 3", codename: "eureka" });
    await vote("2".repeat(32), { verdict: "works", device: "phone" });
    const [game] = await summaryOf(env);
    assert.deepEqual(game.devices.pico.models, { A8110: { works: 1, offlineOnly: 0, fails: 1, name: "Pico 4" } });
    assert.deepEqual(game.devices.quest.models, { "Quest 3": { works: 1, offlineOnly: 0, fails: 0, name: "Meta Quest 3" } });
    assert.equal("models" in game.devices.phone, false);
    // The problems ticked are counted for the model that sent them, and a model without any has none.
    await vote("4".repeat(32), { verdict: "fails", device: "quest", model: "Quest 3S", issues: ["no_sound", "slow"] });
    await vote("5".repeat(32), { verdict: "fails", device: "quest", model: "Quest 3S", issues: ["no_sound"] });
    const quest = (await summaryOf(env))[0].devices.quest.models;
    assert.deepEqual(quest["Quest 3S"].issues, { no_sound: 2, slow: 1 });
    assert.equal("issues" in quest["Quest 3"], false);
    // The name comes with the model when the list knows it; a model it does not know has none, and is shown as it is.
    assert.equal(game.devices.quest.models["Quest 3"].name, "Meta Quest 3");
    assert.equal(game.devices.pico.models.A8110.name, "Pico 4");
    await vote("3".repeat(32), { verdict: "works", device: "phone", model: "ZZ-NOT-A-DEVICE" });
    assert.equal("name" in (await summaryOf(env))[0].devices.phone.models["ZZ-NOT-A-DEVICE"], false);
    await vote(VOTER, { verdict: "works", device: "pico", model: "A8210" });
    assert.deepEqual(Object.keys((await summaryOf(env))[0].devices.pico.models).sort(), ["A8110", "A8210"]);
    assert.equal(db.prepare("SELECT codename FROM votes WHERE model = 'Quest 3'").get().codename, "eureka");
  });

  it("lists the reports of a game, one line for each model, answer and version of GamePort, with how many players said it", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    const vote = (voter, extra) => worker.fetch(post(goodMessage({ voter, ...extra })), env);
    await vote("1".repeat(32), { verdict: "works", device: "quest", model: "Quest 3S", app: "0.9.2" });
    await vote("2".repeat(32), { verdict: "works", device: "quest", model: "Quest 3", app: "0.8.2" });
    await vote("3".repeat(32), { verdict: "works", device: "quest", model: "Quest 3", app: "0.8.2" });
    await vote("4".repeat(32), { verdict: "works", device: "quest", model: "Quest 3", app: "0.8.2" });
    await vote("5".repeat(32), { verdict: "fails", device: "quest", model: "Quest 3", app: "0.7.0" });
    await vote("6".repeat(32), { verdict: "works", device: "phone" });
    // The newest version first, then the most said; a vote without a model is a line of its own, by kind of device.
    assert.deepEqual(await reportsOf(env), [
      { device: "quest", model: "Quest 3S", name: "Meta Quest 3S", verdict: "works", version: "0.9.2", n: 1 },
      { device: "quest", model: "Quest 3", name: "Meta Quest 3", verdict: "works", version: "0.8.2", n: 3 },
      { device: "phone", verdict: "works", version: "0.7.2", n: 1 },
      { device: "quest", model: "Quest 3", name: "Meta Quest 3", verdict: "fails", version: "0.7.0", n: 1 },
    ]);
    // A vote marked as fixed counts as "works", as in the totals, and one added by hand has no version.
    db.prepare("UPDATE vote_history SET fixed = '2026-11-01' WHERE verdict = 'fails'").run();
    db.prepare("UPDATE vote_history SET app = 'admin' WHERE device = 'phone'").run();
    const again = await reportsOf(env);
    assert.equal(again.some((line) => line.verdict === "fails"), false);
    assert.deepEqual(again.find((line) => line.device === "phone"), { device: "phone", verdict: "works", n: 1 });
    // Only the game asked for, only on GET, and the test votes have their own route.
    assert.deepEqual(await reportsOf(env, "/reports/42"), []);
    assert.equal((await worker.fetch(get("/reports/abc"), env)).status, 404);
    assert.equal((await worker.fetch(get("/reports/1125240", "POST"), env)).status, 405);
    assert.deepEqual(await reportsOf(env, "/test/reports/1125240"), []);
    // The summary every app reads is the same as before: the lines are not in it.
    assert.equal("reports" in (await summaryOf(env))[0], false);
  });

  it("keeps the lines of the reports of a game to a few, and lists them by kind of device on a database without the models", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    for (let i = 0; i < 30; i++) await worker.fetch(post(goodMessage({ voter: String(i).padStart(32, "0"), app: `0.${i}.0` })), env);
    assert.equal((await reportsOf(env)).length, 24);
    const old = new DatabaseSync(":memory:");
    old.exec(stripped("model", "codename"));
    const oldEnv = { DB: d1(old), VOTER_SALT: "salt" };
    await worker.fetch(post(goodMessage({ model: "Quest 3", app: "0.9.2" })), oldEnv);
    assert.deepEqual(await reportsOf(oldEnv), [{ device: "quest", verdict: "works", version: "0.9.2", n: 1 }]);
  });

  it("still saves the vote on a database that lacks the columns, keeping the ticks when it has those", async () => {
    const old = new DatabaseSync(":memory:");
    old.exec(stripped("model", "codename"));
    const env = { DB: d1(old), VOTER_SALT: "salt" };
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails", issues: ["slow"], model: "Quest 3" })), env)).status, 204);
    const [game] = await summaryOf(env);
    assert.equal(game.fails, 1);
    assert.deepEqual(game.issues, { slow: 1 });
    assert.equal("models" in game.devices.quest, false);
    old.exec(readFileSync(new URL("./migrations/0013_model.sql", import.meta.url), "utf8"));
    await worker.fetch(post(goodMessage({ voter: OTHER, verdict: "fails", model: "Quest 3" })), env);
    assert.deepEqual((await summaryOf(env))[0].devices.quest.models, { "Quest 3": { works: 0, offlineOnly: 0, fails: 1, name: "Meta Quest 3" } });
  });

  it("is added by the migration to a database that has none, and the test seed runs twice without harm", () => {
    const old = new DatabaseSync(":memory:");
    old.exec(stripped("model", "codename"));
    old.exec(readFileSync(new URL("./migrations/0013_model.sql", import.meta.url), "utf8"));
    old.exec(readFileSync(new URL("./migrations/0012_issues_test_seed.sql", import.meta.url), "utf8"));
    for (let i = 0; i < 2; i++) old.exec(readFileSync(new URL("./migrations/0014_model_test_seed.sql", import.meta.url), "utf8"));
    const rows = old.prepare("SELECT voter, model, codename FROM votes_test ORDER BY voter").all().map((row) => ({ ...row }));
    assert.deepEqual(rows.map((row) => row.model), ["Quest 3", "A8110", "SM-S918B"]);
  });
});

describe("the state of the report that goes with an answer", () => {
  const fresh = () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    return { db, env: { DB: d1(db), VOTER_SALT: "salt" } };
  };
  const stateOf = (db, table = "votes") => db.prepare(`SELECT report_state FROM ${table}`).all().map((row) => row.report_state);

  it("keeps a state the app knows, for an answer that says something went wrong", () => {
    for (const report of ["sent", "waiting", "refused", "none"]) {
      assert.equal(validate(goodMessage({ verdict: "fails", report })).vote.report, report);
      assert.equal(validate(goodMessage({ verdict: "offline_only", report })).vote.report, report);
    }
  });

  it("leaves out a state it does not know or one that goes with \"it worked\", and never refuses the vote for it", () => {
    for (const bad of ["lost", "", 3, null, ["sent"], "SENT"]) {
      const checked = validate(goodMessage({ verdict: "fails", report: bad }));
      assert.equal(checked.error, undefined, JSON.stringify(bad));
      assert.equal("report" in checked.vote, false);
    }
    assert.equal("report" in validate(goodMessage({ verdict: "works", report: "sent" })).vote, false);
    assert.equal("report" in validate(goodMessage({ verdict: "fails" })).vote, false);
  });

  it("stores it with the vote, replaces it when the same answer comes again with another state, and keeps the test set apart", async () => {
    const { db, env } = fresh();
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails", report: "waiting" })), env)).status, 204);
    assert.deepEqual(stateOf(db), ["waiting"]);
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails", report: "sent" })), env)).status, 204);
    assert.deepEqual(stateOf(db), ["sent"]);
    // An older app sends none: the answer is saved, with no state.
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails" })), env)).status, 204);
    assert.deepEqual(stateOf(db), [null]);
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails", report: "none" }), "/test/vote"), env)).status, 204);
    assert.deepEqual(stateOf(db, "votes_test"), ["none"]);
    assert.deepEqual(stateOf(db), [null]);
  });

  it("still saves the vote on a database that has not had the migration, without the state", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(legacySchema.replaceAll(/^\s*report_state +TEXT.*\n/gm, ""));
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "fails", report: "sent", model: "Quest 3" })), env)).status, 204);
    const row = db.prepare("SELECT verdict, model FROM votes").get();
    assert.deepEqual({ ...row }, { verdict: "fails", model: "Quest 3" });
  });

  it("is added by its migration to a database that lacks the columns", () => {
    const old = new DatabaseSync(":memory:");
    old.exec(legacySchema.replaceAll(/^\s*report_state +TEXT.*\n/gm, ""));
    old.exec(readFileSync(new URL("./migrations/0017_report_state.sql", import.meta.url), "utf8"));
    old.prepare("UPDATE votes SET report_state = 'sent'").run();
    assert.doesNotThrow(() => old.prepare("SELECT report_state FROM votes_test").all());
  });
});

describe("how steadily a game ran", () => {
  const fresh = () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    return { db, env: { DB: d1(db), VOTER_SALT: "salt" } };
  };
  // A schema from before migration 0020: the three columns and their place in the views are taken out.
  const beforeMigration = () => {
    const db = new DatabaseSync(":memory:");
    const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8")
      .replaceAll(/report_state TEXT,( +--[^\n]*)\n( +perf_[^\n]*\n)+\);/g, "report_state TEXT$1\n);")
      .replaceAll(", perf_seconds, perf_held, perf_target", "");
    db.exec(schema);
    return { db, env: { DB: d1(db), VOTER_SALT: "salt" } };
  };
  const voter = (i) => i.toString(16).padStart(32, "0");
  const perf = (held, seconds = 600, target = 72) => ({ seconds, held, target });
  const send = async (env, i, extra, path = "/vote") => assert.equal((await worker.fetch(post(goodMessage({ voter: voter(i), model: "Quest 3", ...extra }), path), env)).status, 204);
  const modelOf = async (env, path = "/summary") => (await (await worker.fetch(get(path), env)).json()).games[0].devices.quest.models["Quest 3"];

  it("keeps numbers that make sense together, and leaves out any other without refusing the vote", () => {
    assert.deepEqual(validate(goodMessage({ perf: perf(570) })).vote.perf, { seconds: 600, held: 570, target: 72 });
    const bad = [perf(570, 179), perf(601), perf(-1), perf(10, 90_000), perf(570, 600, 10), perf(570, 600, 500), { seconds: 600.5, held: 5, target: 72 }, { seconds: "600", held: 5, target: 72 }, [600, 570, 72], "steady", null, 7];
    for (const value of bad) {
      const checked = validate(goodMessage({ perf: value }));
      assert.equal(checked.error, undefined, JSON.stringify(value));
      assert.equal("perf" in checked.vote, false, JSON.stringify(value));
    }
    assert.equal("perf" in validate(goodMessage()).vote, false);
  });

  it("stores the numbers with the answer, keeps them when the same answer comes again without, and replaces them with new ones", async () => {
    const { db, env } = fresh();
    const stored = () => ({ ...db.prepare("SELECT perf_seconds AS seconds, perf_held AS held, perf_target AS target FROM votes").get() });
    await send(env, 1, { perf: perf(540) });
    assert.deepEqual(stored(), { seconds: 600, held: 540, target: 72 });
    await send(env, 1, {});
    assert.deepEqual(stored(), { seconds: 600, held: 540, target: 72 });
    await send(env, 1, { perf: perf(300, 1200, 90) });
    assert.deepEqual(stored(), { seconds: 1200, held: 300, target: 90 });
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vote_history").get().n, 1);
    await send(env, 2, { perf: perf(100) }, "/test/vote");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes_test WHERE perf_seconds = 600").get().n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes").get().n, 1);
  });

  it("shows a model's figure from three players: how many, and the middle player's share of the seconds that held the frame rate", async () => {
    const { env } = fresh();
    await send(env, 1, { perf: perf(594) });
    await send(env, 2, { perf: perf(300) });
    assert.equal((await modelOf(env)).perf, undefined);
    await send(env, 3, { perf: perf(540) });
    assert.deepEqual((await modelOf(env)).perf, [{ target: 72, n: 3, pct: 90 }]);
    // One who played for hours weighs as much as the others (shares 0, 50, 90 and 99: the middle is 70), and a sample without the numbers is not counted.
    await send(env, 4, { perf: perf(30, 36_000) });
    await send(env, 5, {});
    assert.deepEqual((await modelOf(env)).perf, [{ target: 72, n: 4, pct: 70 }]);
  });

  it("keeps each frame rate apart, since a player can run the same game at 72, 90 or 120 and only a rate with three players shows", async () => {
    const { env } = fresh();
    for (let i = 1; i <= 3; i++) await send(env, i, { perf: perf(590 + i, 600, 90) });
    for (let i = 4; i <= 5; i++) await send(env, i, { perf: perf(300, 600, 72) });
    for (let i = 6; i <= 9; i++) await send(env, i, { perf: perf(500, 600, 120) });
    assert.deepEqual((await modelOf(env)).perf, [{ target: 120, n: 4, pct: 83 }, { target: 90, n: 3, pct: 99 }]);
  });

  it("puts the same figure on the lines of the details of a game, for the line of each model, answer and version", async () => {
    const { env } = fresh();
    for (let i = 1; i <= 3; i++) await send(env, i, { perf: perf(540 + i) });
    await send(env, 4, { verdict: "fails", perf: perf(10) });
    const body = await (await worker.fetch(get("/reports/1125240"), env)).json();
    const works = body.reports.find((line) => line.verdict === "works");
    assert.deepEqual(works.perf, [{ target: 72, n: 3, pct: 90 }]);
    assert.equal(body.reports.find((line) => line.verdict === "fails").perf, undefined);
  });

  it("still saves the answer on a database that has not had the migration, and the migration adds the columns without touching the answers", async () => {
    const { db, env } = beforeMigration();
    await send(env, 1, { perf: perf(540) });
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes").get().n, 1);
    assert.equal((await worker.fetch(get("/summary"), env)).status, 200);
    assert.equal((await worker.fetch(get("/reports/1125240"), env)).status, 200);
    db.exec(readFileSync(new URL("./migrations/0020_performance.sql", import.meta.url), "utf8"));
    assert.equal(db.prepare("SELECT verdict, perf_seconds FROM votes").get().perf_seconds, null);
    await send(env, 2, { perf: perf(540) });
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes WHERE perf_seconds = 600").get().n, 1);
    assert.doesNotThrow(() => db.prepare("SELECT perf_held FROM votes_test").all());
  });

  it("migration 0022 moves the Discord name from the history of the answers to the table of the players, and drops the two columns", () => {
    const db = new DatabaseSync(":memory:");
    // The database as an earlier version of the migration left it: the two columns on the history of the answers, no table of contacts.
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replaceAll(/CREATE TABLE IF NOT EXISTS player_contacts(_test)? \([^)]*\);/g, ""));
    db.exec("ALTER TABLE vote_history ADD COLUMN discord TEXT; ALTER TABLE vote_history ADD COLUMN code TEXT; ALTER TABLE vote_history_test ADD COLUMN discord TEXT; ALTER TABLE vote_history_test ADD COLUMN code TEXT;");
    // The views of the last answers name the two columns too, as they do on the real database.
    db.exec("DROP VIEW votes; DROP VIEW votes_test;");
    for (const [view, history] of [["votes", "vote_history"], ["votes_test", "vote_history_test"]]) {
      db.exec(`CREATE VIEW ${view} AS SELECT app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state, perf_seconds, perf_held, perf_target, discord, code FROM ${history} WHERE id IN (SELECT MAX(id) FROM ${history} GROUP BY app_id, voter)`);
    }
    db.exec(`INSERT INTO vote_history (app_id, voter, verdict, app, device, updated, discord, code) VALUES
      (5, 'aaaaaaaaaaaa', 'fails', '0.9.4', 'quest', '2026-11-04', 'old.name', 'B40C70'),
      (6, 'aaaaaaaaaaaa', 'fails', '0.9.4', 'quest', '2026-11-05', 'new.name', 'B40C70'),
      (5, 'bbbbbbbbbbbb', 'works', '0.9.4', 'quest', '2026-11-05', NULL, NULL)`);
    db.exec(readFileSync(new URL("./migrations/0022_player_contacts.sql", import.meta.url), "utf8"));
    // One name per player: the latest one given.
    assert.deepEqual(db.prepare("SELECT voter, discord FROM player_contacts").all().map((row) => ({ ...row })), [{ voter: "aaaaaaaaaaaa", discord: "new.name" }]);
    assert.doesNotThrow(() => db.prepare("SELECT discord FROM player_contacts_test").all());
    assert.throws(() => db.prepare("SELECT discord FROM vote_history").all());
    assert.throws(() => db.prepare("SELECT code FROM vote_history_test").all());
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes").get().n, 3);
  });
});

describe("the name of a device", () => {
  it("names the headsets Google's list does not have, by model then by codename", () => {
    assert.equal(deviceLabel("Quest 3", "eureka"), "Meta Quest 3");
    assert.equal(deviceLabel("Quest 3S", null), "Meta Quest 3S");
    assert.equal(deviceLabel("A8110", null), "Pico 4");
    assert.equal(deviceLabel("Something new", "panther"), "Meta Quest 3S");
  });

  it("names the Pico 4 and the Pico 4 Ultra, which Google's list gives to a watch by codename", () => {
    assert.equal(deviceLabel("A92Y0", "sparrow"), "Pico 4 Ultra");
    assert.equal(deviceLabel(null, "sparrow"), "Pico 4 Ultra");
    assert.equal(deviceLabel("A81E0", "PICOA8110"), "Pico 4");
    assert.equal(deviceLabel(null, "PICOA8110"), "Pico 4");
  });

  it("names the Pico Space Pro (once called Project Swan) by model or by codename", () => {
    assert.equal(deviceLabel("B3110", "swan"), "Pico Space Pro");
    assert.equal(deviceLabel("B3110", null), "Pico Space Pro");
    assert.equal(deviceLabel(null, "swan"), "Pico Space Pro");
  });

  it("names a phone or a tablet from Google Play's list", () => {
    assert.equal(deviceLabel("SM-S918B", "dm3q"), "Samsung Galaxy S23 Ultra");
    assert.equal(deviceLabel("Pixel 7", null), "Google Pixel 7");
  });

  it("answers nothing for a code it does not know, so the raw code is shown", () => {
    assert.equal(deviceLabel("ZZ-NOT-A-DEVICE", "nope"), null);
    assert.equal(deviceLabel(null, null), null);
  });
});

describe("the history of the answers", () => {
  const fresh = () => {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    return { db, env: { DB: d1(db), VOTER_SALT: "salt" } };
  };
  const vote = (env, extra, path = "/vote") => worker.fetch(post(goodMessage(extra), path), env);
  const lines = (db, table = "vote_history") => db.prepare(`SELECT verdict, app FROM ${table} ORDER BY id`).all().map((row) => [row.verdict, row.app]);

  it("keeps every answer, and what is read is the last one of the player", async () => {
    const { db, env } = fresh();
    await vote(env, { verdict: "fails", app: "0.8.2" });
    await vote(env, { verdict: "works", app: "0.9.0" });
    await vote(env, { verdict: "works", app: "0.9.3" });
    assert.deepEqual(lines(db), [["fails", "0.8.2"], ["works", "0.9.0"], ["works", "0.9.3"]]);
    assert.deepEqual(db.prepare("SELECT verdict, app FROM votes").all().map((row) => [row.verdict, row.app]), [["works", "0.9.3"]]);
    // The totals count the player once, with the last answer.
    const [game] = (await (await worker.fetch(get(), env)).json()).games;
    assert.equal(game.works, 1);
    assert.equal(game.fails, 0);
  });

  it("renews the last line when the answer and the versions are the same, so the daily question adds nothing", async () => {
    const { db, env } = fresh();
    await vote(env, { verdict: "fails", app: "0.8.2", device: "quest", model: "Quest 3" });
    await vote(env, { verdict: "fails", app: "0.8.2", device: "quest", model: "Quest 3S", issues: ["slow"] });
    assert.deepEqual(lines(db), [["fails", "0.8.2"]]);
    // What changed in the renewed answer is kept (the model, what was ticked).
    const row = db.prepare("SELECT model, issues FROM votes").get();
    assert.equal(row.model, "Quest 3S");
    assert.equal(row.issues, "slow");
  });

  it("adds a line when the version of GamePort or the build of the game changes, even for the same answer", async () => {
    const { db, env } = fresh();
    await vote(env, { verdict: "works", app: "0.9.0", game: "b1" });
    await vote(env, { verdict: "works", app: "0.9.3", game: "b1" });
    await vote(env, { verdict: "works", app: "0.9.3", game: "b2" });
    assert.equal(lines(db).length, 3);
  });

  it("counts a renewed answer again, as an answer marked as fixed is a vote like another when the player renews it", async () => {
    const { db, env } = fresh();
    await vote(env, { verdict: "fails", app: "0.8.2" });
    db.prepare("UPDATE vote_history SET fixed = '2026-11-01', fixed_in = '0.9.0'").run();
    await vote(env, { verdict: "fails", app: "0.8.2" });
    assert.equal(db.prepare("SELECT fixed FROM votes").get().fixed, null);
  });

  it("keeps the players and the sets apart", async () => {
    const { db, env } = fresh();
    await vote(env, { verdict: "works" });
    await vote(env, { verdict: "fails", voter: OTHER });
    await vote(env, { verdict: "fails" }, "/test/vote");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes").get().n, 2);
    assert.deepEqual(lines(db, "vote_history_test"), [["fails", "0.7.2"]]);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes_test").get().n, 1);
  });

  it("is made by the migration from a database that has only the last answers, and keeps every one of them", async () => {
    const old = new DatabaseSync(":memory:");
    old.exec(legacySchema);
    old.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated, fixed, fixed_in, voted_at, issues, model, codename, report_state) VALUES (1, 'aaaaaaaaaaaa', 'fails', '0.8.2', 'b1', 'quest', 0, '2026-10-08', '2026-10-20', '0.9.0', '2026-10-08T10:00:00Z', 'slow', 'Quest 3', 'eureka', 'sent')").run();
    old.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (2, 'bbbbbbbbbbbb', 'works', '0.9.0', NULL, 'pico', 1, '2026-10-09')").run();
    old.prepare("INSERT INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated) VALUES (3, 'cccccccccccc', 'works', '0.9.0', NULL, 'phone', 0, '2026-10-09')").run();
    const before = old.prepare("SELECT * FROM votes ORDER BY voter").all().map((row) => ({ ...row }));
    old.exec(readFileSync(new URL("./migrations/0019_vote_history.sql", import.meta.url), "utf8"));
    // What is read is the same as before, column for column.
    assert.deepEqual(old.prepare("SELECT * FROM votes ORDER BY voter").all().map((row) => ({ ...row })), before);
    assert.equal(old.prepare("SELECT COUNT(*) AS n FROM vote_history").get().n, 2);
    assert.equal(old.prepare("SELECT COUNT(*) AS n FROM vote_history_test").get().n, 1);
    // And the relay writes the next answer as a new line.
    const env = { DB: d1(old), VOTER_SALT: "salt" };
    await vote(env, { appId: 1, verdict: "works", app: "0.9.3" });
    assert.equal(old.prepare("SELECT COUNT(*) AS n FROM vote_history").get().n, 3);
  });

  it("tells in the summary from which version a game works after it did not, and which version still works, for each kind of device", async () => {
    const { env } = fresh();
    await vote(env, { verdict: "fails", app: "0.8.2" });
    await vote(env, { verdict: "works", app: "0.9.0" });
    await vote(env, { verdict: "works", app: "0.9.3" });
    await vote(env, { verdict: "works", app: "0.9.1", voter: OTHER });
    const [game] = (await (await worker.fetch(get(), env)).json()).games;
    assert.deepEqual(game.devices.quest.turn, { fixedIn: "0.9.0", failedIn: "0.8.2", stillIn: "0.9.3" });
  });

  it("has no turn in the summary for a game whose players never changed their answer, or without a history", async () => {
    const { env } = fresh();
    await vote(env, { verdict: "works", app: "0.9.0" });
    assert.equal("turn" in (await (await worker.fetch(get(), env)).json()).games[0].devices.quest, false);
    const old = new DatabaseSync(":memory:");
    old.exec(legacySchema);
    const oldEnv = { DB: d1(old), VOTER_SALT: "salt" };
    await vote(oldEnv, { verdict: "fails", app: "0.8.2" });
    assert.equal("turn" in (await (await worker.fetch(get(), oldEnv)).json()).games[0].devices.quest, false);
  });

  it("lists in the reports what the players of a line ticked, and from which version an older line may be solved", async () => {
    const { env } = fresh();
    await vote(env, { verdict: "fails", app: "0.8.2", model: "Quest 3" });
    await vote(env, { verdict: "works", app: "0.9.0", model: "Quest 3" });
    await vote(env, { verdict: "fails", app: "0.7.0", model: "Quest 3", voter: OTHER, issues: ["no_sound", "slow"] });
    await vote(env, { verdict: "fails", app: "0.7.0", model: "A8110", device: "pico", voter: "3".repeat(32), issues: ["no_sound"] });
    const answer = await (await worker.fetch(get("/reports/1125240"), env)).json();
    const quest = answer.reports.find((line) => line.verdict === "fails" && line.device === "quest");
    // The older line of the same kind of device that was seen working since: may be solved. Another kind of device is not told.
    assert.deepEqual(quest, { device: "quest", model: "Quest 3", name: "Meta Quest 3", verdict: "fails", version: "0.7.0", n: 1, issues: { no_sound: 1, slow: 1 }, fixedSince: "0.9.0" });
    assert.equal("fixedSince" in answer.reports.find((line) => line.device === "pico"), false);
    assert.deepEqual(answer.turns, { quest: { fixedIn: "0.9.0", failedIn: "0.8.2" } });
  });

  it("still saves an answer on a database that has no history yet, the old way", async () => {
    const old = new DatabaseSync(":memory:");
    old.exec(legacySchema);
    const env = { DB: d1(old), VOTER_SALT: "salt" };
    assert.equal((await vote(env, { verdict: "fails" })).status, 204);
    assert.equal((await vote(env, { verdict: "works" })).status, 204);
    assert.deepEqual(old.prepare("SELECT verdict FROM votes").all().map((row) => row.verdict), ["works"]);
  });
});
