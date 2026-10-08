import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, it } from "node:test";
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
      };
    },
  };
}

describe("validate", () => {
  it("accepts a good message and keeps only the known fields", () => {
    const { vote, error } = validate({ ...goodMessage({ game: "build-1.2" }), extra: "ignored", ip: "1.2.3.4" });
    assert.equal(error, undefined);
    const { v, ...expected } = goodMessage({ game: "build-1.2" });
    assert.deepEqual(vote, { ...expected, offline: false });
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
    db.prepare("INSERT INTO votes VALUES (9, 'aaaaaaaaaaaa', 'fails', '0.7.2', NULL, 'quest', 1, '2026-10-08')").run();
    db.prepare("INSERT INTO votes VALUES (9, 'bbbbbbbbbbbb', 'works', '0.7.2', NULL, 'quest', 1, '2026-10-08')").run();
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
    assert.throws(() => db.prepare("INSERT INTO votes VALUES (1, 'x', 'maybe', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
    assert.doesNotThrow(() => db.prepare("INSERT INTO votes VALUES (1, 'x', 'offline_only', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
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
    const old = readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replaceAll(/^\s*offline INTEGER.*\n/gm, "").replaceAll("'works', 'offline_only', 'fails'", "'works', 'fails'");
    assert.ok(!old.includes("offline"));
    db.exec(old);
    db.prepare("INSERT INTO votes VALUES (1, 'aaaaaaaaaaaa', 'works', '0.7.2', NULL, 'quest', '2026-10-08')").run();
    db.exec(readFileSync(new URL("./migrations/0001_offline.sql", import.meta.url), "utf8"));
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
    const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replaceAll("'works', 'offline_only', 'fails'", "'works', 'fails'");
    assert.ok(!schema.includes("offline_only"));
    db.exec(schema);
    db.prepare("INSERT INTO votes VALUES (1, 'aaaaaaaaaaaa', 'works', '0.7.2', 'b1', 'quest', 1, '2026-10-08')").run();
    db.prepare("INSERT INTO votes VALUES (1, 'bbbbbbbbbbbb', 'fails', '0.7.2', NULL, 'pico', 0, '2026-10-08')").run();
    db.prepare("INSERT INTO votes_test VALUES (2, 'cccccccccccc', 'works', '0.7.2', NULL, 'phone', 0, '2026-10-08')").run();
    assert.throws(() => db.prepare("INSERT INTO votes VALUES (1, 'x', 'offline_only', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
    db.exec(readFileSync(new URL("./migrations/0002_offline_only.sql", import.meta.url), "utf8"));
    assert.deepEqual(db.prepare("SELECT * FROM votes ORDER BY voter").all().map((row) => ({ ...row })), [
      { app_id: 1, voter: "aaaaaaaaaaaa", verdict: "works", app: "0.7.2", game: "b1", device: "quest", offline: 1, updated: "2026-10-08" },
      { app_id: 1, voter: "bbbbbbbbbbbb", verdict: "fails", app: "0.7.2", game: null, device: "pico", offline: 0, updated: "2026-10-08" },
    ]);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes_test").get().n, 1);
    const env = { DB: d1(db), VOTER_SALT: "salt" };
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "offline_only" })), env)).status, 204);
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "offline_only" }), "/test/vote"), env)).status, 204);
    assert.throws(() => db.prepare("INSERT INTO votes VALUES (9, 'x', 'maybe', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run());
    // Voting again still replaces: the key of the table is kept.
    assert.equal((await worker.fetch(post(goodMessage({ verdict: "works" })), env)).status, 204);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes WHERE app_id = 1125240").get().n, 1);
  });
});
