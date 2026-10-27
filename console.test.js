import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { before, beforeEach, describe, it } from "node:test";
import worker from "./worker.js";

const ORIGIN = "https://relay.example.invalid";
const TEAM = "team";
const AUD = "audience-tag";
const EMAIL = "someone@example.invalid";
const VOTER = "0123456789abcdef0123456789abcdef";

/** The D1 interface over SQLite, as in worker.test.js. */
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

const b64url = (input) => Buffer.from(input).toString("base64url");
let keys;
let otherKeys;

async function makeKeys(kid) {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid, alg: "RS256", use: "sig" };
  return { pair, jwk, kid };
}

/** A token as Cloudflare Access makes it, signed with the given key. */
async function token(signer, claims = {}, headerExtra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: signer.kid, ...headerExtra };
  const payload = { aud: [AUD], iss: `https://${TEAM}.cloudflareaccess.com`, email: EMAIL, exp: now + 600, nbf: now - 10, ...claims };
  const signed = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signer.pair.privateKey, new TextEncoder().encode(signed));
  return `${signed}.${b64url(new Uint8Array(signature))}`;
}

before(async () => {
  keys = await makeKeys("k1");
  otherKeys = await makeKeys("k1");
});

let db;
let env;
const rows = (table = "votes") => db.prepare(`SELECT * FROM ${table} ORDER BY app_id, voter`).all().map((row) => ({ ...row }));

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  env = { DB: d1(db), VOTER_SALT: "salt", ACCESS_TEAM: TEAM, ACCESS_AUD: AUD, ADMIN_EMAIL: EMAIL, ACCESS_JWKS: JSON.stringify({ keys: [keys.jwk] }) };
});

const ask = async (path, { method = "GET", body, jwt, headers = {}, page = true, signer = keys } = {}) => {
  const all = { ...headers };
  const given = jwt === undefined ? await token(signer) : jwt;
  if (given) all["cf-access-jwt-assertion"] = given;
  if (method === "POST" && page) Object.assign(all, { "content-type": "application/json", "x-gameport-console": "1", origin: ORIGIN });
  return worker.fetch(new Request(`${ORIGIN}${path}`, { method, headers: all, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) }), env);
};

const vote = (appId, voter, extra = {}) => db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
  .run(appId, voter, extra.verdict ?? "fails", extra.app ?? "0.7.2", null, extra.device ?? "quest", extra.offline ? 1 : 0, "2026-10-08");
const summary = async (path = "/summary") => (await (await worker.fetch(new Request(`${ORIGIN}${path}`), env)).json()).games;

describe("who may come in", () => {
  it("opens for a token made by Access for this application and this address", async () => {
    assert.equal((await ask("/console")).status, 200);
  });

  it("tells the price of an app on Steam for the Steam button, asks again when Steam does not answer, and refuses what is not a number", async () => {
    const realFetch = globalThis.fetch;
    let answer = { 7: { success: true, data: { is_free: false, price_overview: { final_formatted: "9,99€", initial_formatted: "19,99€", discount_percent: 50 } } } };
    globalThis.fetch = async (url) => (String(url).startsWith("https://store.steampowered.com/") ? new Response(JSON.stringify(answer)) : new Response(null, { status: 204 }));
    try {
      assert.deepEqual(await (await ask("/console/api/price?id=7")).json(), { id: 7, free: false, price: "9,99€", before: "19,99€", discount: 50 });
      answer = { 8: { success: true, data: { is_free: true } } };
      assert.deepEqual(await (await ask("/console/api/price?id=8")).json(), { id: 8, free: true, price: null, before: null, discount: 0 });
      globalThis.fetch = async () => { throw new Error("down"); };
      assert.equal((await (await ask("/console/api/price?id=9")).json()).price, null);
      assert.equal((await ask("/console/api/price?id=x")).status, 400);
      assert.equal((await ask("/console/api/price?id=7", { method: "POST" })).status, 405);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("serves the page at an address that names the set and what is open, so a refresh comes back to the same place", async () => {
    for (const path of ["/console/test", "/console/prod", "/console/prod/", "/console/test/1125240", "/console/prod/reports", "/console/prod/news", "/console/test/reasons"]) {
      const response = await ask(path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get("content-type"), /text\/html/, path);
    }
    for (const path of ["/console/other", "/console/prod/other", "/console/prod/1/2", "/console/prod/12345678901", "/console/reports"]) {
      assert.equal((await ask(path)).status, 404, path);
    }
    assert.equal((await ask("/console/prod/1125240", { jwt: null })).status, 404);
  });

  it("does not exist without the three secrets, whatever the token says", async () => {
    for (const missing of ["ACCESS_TEAM", "ACCESS_AUD", "ADMIN_EMAIL"]) {
      const without = { ...env };
      delete without[missing];
      const response = await worker.fetch(new Request(`${ORIGIN}/console`, { headers: { "cf-access-jwt-assertion": await token(keys) } }), without);
      assert.equal(response.status, 404, missing);
    }
  });

  it("refuses no token, a broken token, a token of another key, another application, another issuer, another address, an old one and a weak algorithm", async () => {
    const good = await token(keys);
    const [h, p] = good.split(".");
    const bad = [
      "",
      "a.b",
      "a.b.c",
      good.slice(0, -4) + "AAAA",
      await token(otherKeys),
      await token(keys, { aud: ["another"] }),
      await token(keys, { iss: "https://evil.cloudflareaccess.com" }),
      await token(keys, { email: "other@example.invalid" }),
      await token(keys, { email: undefined }),
      await token(keys, { exp: Math.floor(Date.now() / 1000) - 5 }),
      await token(keys, { nbf: Math.floor(Date.now() / 1000) + 3600 }),
      await token(keys, {}, { alg: "HS256" }),
      await token(keys, {}, { alg: "none" }),
      `${h}.${p}.`,
      `${b64url(JSON.stringify({ alg: "none" }))}.${p}.x`,
      await token({ ...keys, kid: "unknown" }),
    ];
    for (const jwt of bad) {
      const response = await ask("/console", { jwt });
      assert.equal(response.status, 404, `should refuse ${jwt.slice(0, 30)}`);
    }
    const noHeader = await ask("/console", { jwt: null });
    assert.equal(noHeader.status, 404);
  });

  it("takes the address in any letter case, and an audience among several", async () => {
    assert.equal((await ask("/console", { jwt: await token(keys, { email: EMAIL.toUpperCase(), aud: ["x", AUD] }) })).status, 200);
  });

  it("answers 404 on every route of the console, not only the page, when the token is missing", async () => {
    for (const path of ["/console", "/console/", "/console/api/votes?env=test&appId=1", "/console/api/add", "/console/api/change", "/console/api/remove", "/console/whatever"]) {
      const response = await ask(path, { jwt: null, method: path.includes("/api/") && !path.includes("votes") ? "POST" : "GET" });
      assert.equal(response.status, 404, path);
    }
    assert.deepEqual(rows(), []);
  });

  it("keeps the routes of the relay as they were", async () => {
    assert.equal((await worker.fetch(new Request(`${ORIGIN}/summary`), env)).status, 200);
    assert.equal((await worker.fetch(new Request(`${ORIGIN}/console2`), env)).status, 404);
  });
});

describe("the page", () => {
  it("is served with a policy that lets only its own script and style run, and is never kept", async () => {
    const response = await ask("/console");
    const policy = response.headers.get("content-security-policy");
    const nonce = /script-src 'nonce-([^']+)'/.exec(policy)[1];
    const html = await response.text();
    assert.ok(html.includes(`<script nonce="${nonce}">`));
    assert.ok(html.includes(`<style nonce="${nonce}">`));
    assert.match(policy, /default-src 'none'/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.ok(!/unsafe-inline|unsafe-eval/.test(policy));
    assert.equal(response.headers.get("cache-control"), "no-store");
    const again = /script-src 'nonce-([^']+)'/.exec((await ask("/console")).headers.get("content-security-policy"))[1];
    assert.notEqual(again, nonce);
  });

  it("shows the environment in a banner, test first", async () => {
    const html = await (await ask("/console")).text();
    assert.ok(html.includes('<body class="test">'));
    assert.ok(html.includes("PRODUCTION"));
    assert.ok(html.includes("TEST"));
  });

  it("has a filter on the device, on all devices to start with", async () => {
    const html = await (await ask("/console")).text();
    assert.ok(html.includes('<select id="device"'));
    assert.ok(html.includes('<option value="all">All devices</option>'));
  });
});

describe("reading the votes", () => {
  it("lists the votes of a game in the real set or the test set, and nothing from another game", async () => {
    vote(5, "aaaaaaaaaaaa");
    vote(6, "bbbbbbbbbbbb");
    db.prepare("INSERT INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated) VALUES (5, 'cccccccccccc', 'works', '0.7.2', NULL, 'pico', 1, '2026-10-09')").run();
    const real = await (await ask("/console/api/votes?env=prod&appId=5")).json();
    assert.deepEqual(real.votes.map((v) => v.voter), ["aaaaaaaaaaaa"]);
    const test = await (await ask("/console/api/votes?env=test&appId=5")).json();
    assert.deepEqual(test.votes.map((v) => [v.voter, v.offline, v.fixed]), [["cccccccccccc", true, null]]);
  });

  it("refuses an environment or a game that is not one", async () => {
    for (const query of ["env=votes&appId=5", "env=&appId=5", "appId=5", "env=prod", "env=prod&appId=0", "env=prod&appId=x", "env=prod&appId=3000000000", "env=votes_test%3B%20DROP%20TABLE%20votes&appId=5"]) {
      assert.equal((await ask(`/console/api/votes?${query}`)).status, 400, query);
    }
    assert.equal((await ask("/console/api/votes?env=prod&appId=5", { method: "POST" })).status, 405);
  });
});

describe("adding a vote", () => {
  it("stores a vote of its own, counted like a player's, in the set that was asked", async () => {
    const response = await ask("/console/api/add", { method: "POST", body: { env: "test", appId: 7, device: "pico", verdict: "works", offline: true } });
    assert.equal(response.status, 200);
    const { voter } = await response.json();
    assert.match(voter, /^[0-9a-f]{12}$/);
    assert.deepEqual(rows(), []);
    const [stored] = rows("votes_test");
    assert.deepEqual({ ...stored, voter: undefined }, { app_id: 7, voter: undefined, verdict: "works", app: "admin", game: null, device: "pico", offline: 1, updated: new Date().toISOString().slice(0, 10), fixed: null, fixed_in: null, voted_at: `${new Date().toISOString().slice(0, 13)}:00:00Z`, issues: null, model: null, codename: null });
    assert.deepEqual(await summary("/test/summary"), [{ appId: 7, works: 1, offlineOnly: 0, fails: 0, worksOffline: 1, devices: { pico: { works: 1, offlineOnly: 0, fails: 0, worksOffline: 1 } } }]);
    assert.deepEqual(await summary(), []);
  });

  it("lets the developer give the version of GamePort of a vote he adds, and says admin when he gives none", async () => {
    const add = (extra) => ask("/console/api/add", { method: "POST", body: { env: "prod", appId: 7, device: "pico", verdict: "works", ...extra } });
    assert.equal((await add({ app: "0.8.1" })).status, 200);
    assert.equal((await add({})).status, 200);
    assert.deepEqual(rows().map((r) => r.app).sort(), ["0.8.1", "admin"]);
    for (const app of ["<script>", "x".repeat(33), 7, ""].slice(0, 3)) assert.equal((await add({ app })).status, 400, String(app));
  });

  it("lets the developer tick what went wrong on a vote he adds, from the fixed list, and only for an answer that says something did", async () => {
    const add = (extra) => ask("/console/api/add", { method: "POST", body: { env: "prod", appId: 7, device: "pico", verdict: "fails", ...extra } });
    assert.equal((await add({ issues: ["no_sound", "closes", "no_sound"] })).status, 200);
    assert.equal((await add({ verdict: "works", issues: ["no_sound"] })).status, 200);
    const stored = rows().map((r) => [r.verdict, r.issues]).sort();
    assert.deepEqual(stored, [["fails", "no_sound,closes"], ["works", null]]);
    for (const bad of ["no_sound", ["not_a_code"], [3]]) assert.equal((await add({ issues: bad })).status, 400, JSON.stringify(bad));
  });

  it("tells the private channel of a vote added in production, as admin, and not one added in the test set", async () => {
    const realFetch = globalThis.fetch;
    const sent = [];
    const waiting = [];
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith("https://store.steampowered.com/")) return new Response("{}", { status: 500 });
      sent.push(JSON.parse(options.body));
      return new Response(null, { status: 204 });
    };
    try {
      env.DISCORD_ADMIN_WEBHOOK = "https://discord.com/api/webhooks/123456789/token-abc_DEF";
      const send = async (environment) => {
        const jwt = await token(keys);
        const request = new Request(`${ORIGIN}/console/api/add`, { method: "POST", headers: { "cf-access-jwt-assertion": jwt, "content-type": "application/json", "x-gameport-console": "1", origin: ORIGIN }, body: JSON.stringify({ env: environment, appId: 7, device: "pico", verdict: "works" }) });
        const response = await worker.fetch(request, env, { waitUntil: (p) => waiting.push(p) });
        await Promise.all(waiting);
        return response;
      };
      // The test set has no channel of its own here: nothing is told.
      assert.equal((await send("test")).status, 200);
      assert.equal(sent.length, 0);
      // With one, the vote added in the test set goes there, and only there.
      env.DISCORD_TEST_WEBHOOK = "https://discord.com/api/webhooks/987654321/test-token_XYZ";
      const hooks = [];
      const inner = globalThis.fetch;
      globalThis.fetch = async (url, options) => { hooks.push(String(url)); return inner(url, options); };
      assert.equal((await send("test")).status, 200);
      globalThis.fetch = inner;
      assert.deepEqual(hooks.filter((u) => u.startsWith("https://discord.com/")), ["https://discord.com/api/webhooks/987654321/test-token_XYZ"]);
      sent.length = 0;
      assert.equal((await send("prod")).status, 200);
      assert.equal(sent.length, 1);
      assert.deepEqual(sent[0].embeds[0].fields.map((f) => f.value).slice(0, 3), ["Works", "Pico", "admin"]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("adds in production only when production is asked, and each added vote counts once more", async () => {
    for (let i = 0; i < 3; i++) await ask("/console/api/add", { method: "POST", body: { env: "prod", appId: 7, device: "quest", verdict: "fails" } });
    assert.equal(rows().length, 3);
    assert.equal((await summary())[0].fails, 3);
  });

  it("takes \"tried offline\" only from a vote that says it works", async () => {
    await ask("/console/api/add", { method: "POST", body: { env: "prod", appId: 7, device: "quest", verdict: "fails", offline: true } });
    assert.equal(rows()[0].offline, 0);
  });

  it("refuses what is not exactly known, and stores nothing", async () => {
    const good = { env: "prod", appId: 7, device: "quest", verdict: "works" };
    const bad = [
      { ...good, env: "votes" }, { ...good, env: undefined }, { ...good, appId: 0 }, { ...good, appId: "7" }, { ...good, appId: 1.5 }, { ...good, appId: 3_000_000_000 },
      { ...good, device: "toaster" }, { ...good, device: undefined }, { ...good, verdict: "maybe" }, { ...good, verdict: undefined }, { ...good, offline: "yes" },
    ];
    for (const body of bad) assert.equal((await ask("/console/api/add", { method: "POST", body })).status, 400, JSON.stringify(body));
    assert.deepEqual([rows(), rows("votes_test")], [[], []]);
  });
});

describe("changing any vote", () => {
  it("changes the device, the answer and the offline mark of a vote a player sent", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "fails", device: "quest" });
    const response = await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", verdict: "works", device: "pico", offline: true } });
    assert.equal(response.status, 200);
    const [row] = rows();
    assert.deepEqual([row.verdict, row.device, row.offline, row.app], ["works", "pico", 1, "0.7.2"]);
  });

  it("keeps what is not named, and drops the offline mark when the answer stops saying it works", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "works", device: "quest", offline: true });
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", device: "phone" } });
    assert.deepEqual([rows()[0].verdict, rows()[0].device, rows()[0].offline], ["works", "phone", 1]);
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", verdict: "fails" } });
    assert.deepEqual([rows()[0].verdict, rows()[0].offline], ["fails", 0]);
  });

  it("marks a vote as fixed: it counts as works, and nothing else is touched", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "fails" });
    vote(5, "bbbbbbbbbbbb", { verdict: "works" });
    assert.equal((await summary())[0].fails, 1);
    const response = await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: true, fixedIn: "0.9.0" } });
    assert.equal(response.status, 200);
    const today = new Date().toISOString().slice(0, 10);
    assert.deepEqual(rows().map((r) => [r.voter, r.fixed, r.fixed_in]), [["aaaaaaaaaaaa", today, "0.9.0"], ["bbbbbbbbbbbb", null, null]]);
    const [game] = await summary();
    assert.deepEqual([game.works, game.fails], [2, 0]);
    assert.equal(rows()[0].verdict, "fails");
    // The site is told the day, and the version, without a word about the player.
    assert.deepEqual(game.fixes, [{ device: "quest", day: today, version: "0.9.0" }]);
    assert.ok(!JSON.stringify(game).includes("aaaaaaaaaaaa"));
  });

  it("keeps the first day it was marked, even when it is marked again", async () => {
    vote(5, "aaaaaaaaaaaa");
    db.prepare("UPDATE votes SET fixed = '2026-01-02' WHERE voter = 'aaaaaaaaaaaa'").run();
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: true } });
    assert.equal(rows()[0].fixed, "2026-01-02");
  });

  it("counts a vote as it was again, and forgets where it was fixed", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "fails" });
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: true, fixedIn: "0.9.0" } });
    assert.deepEqual([(await summary())[0].works, (await summary())[0].fails], [1, 0]);
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: false } });
    assert.deepEqual([rows()[0].fixed, rows()[0].fixed_in], [null, null]);
    assert.equal((await summary())[0].fails, 1);
  });

  it("lets a player who votes again count again: a vote marked fixed is a vote like another when it is renewed", async () => {
    await worker.fetch(new Request(`${ORIGIN}/vote`, { method: "POST", body: JSON.stringify({ v: 1, appId: 5, verdict: "fails", app: "0.7.2", device: "quest", voter: VOTER }) }), env);
    const voter = rows()[0].voter;
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter, fixed: true, fixedIn: "0.9.0" } });
    assert.deepEqual([(await summary())[0].works, (await summary())[0].fails], [1, 0]);
    await worker.fetch(new Request(`${ORIGIN}/vote`, { method: "POST", body: JSON.stringify({ v: 1, appId: 5, verdict: "fails", app: "0.9.1", device: "quest", voter: VOTER }) }), env);
    assert.deepEqual([rows()[0].fixed, rows()[0].fixed_in], [null, null]);
    assert.equal((await summary())[0].fails, 1);
  });

  it("refuses a vote that does not exist, and values that are not exactly known", async () => {
    vote(5, "aaaaaaaaaaaa");
    const base = { env: "prod", appId: 5, voter: "aaaaaaaaaaaa" };
    assert.equal((await ask("/console/api/change", { method: "POST", body: { ...base, voter: "ffffffffffff", verdict: "works" } })).status, 404);
    assert.equal((await ask("/console/api/change", { method: "POST", body: { ...base, appId: 6, verdict: "works" } })).status, 404);
    const bad = [
      { ...base, voter: "short" }, { ...base, voter: "AAAAAAAAAAAA" }, { ...base, voter: "aaaaaaaaaaaa'; DROP TABLE votes; --" },
      { ...base, verdict: "maybe" }, { ...base, device: "toaster" }, { ...base, offline: 1 },
      { ...base, fixed: "yes" }, { ...base, fixed: true, fixedIn: "<script>" }, { ...base, fixed: true, fixedIn: "x".repeat(33) }, { ...base, fixed: true, fixedIn: 7 },
      { ...base, env: "votes" }, { ...base, appId: -1 },
    ];
    for (const body of bad) assert.equal((await ask("/console/api/change", { method: "POST", body })).status, 400, JSON.stringify(body));
    assert.deepEqual([rows()[0].verdict, rows()[0].fixed], ["fails", null]);
  });

  it("changes only the set that was asked", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "fails" });
    db.prepare("INSERT INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated) VALUES (5, 'aaaaaaaaaaaa', 'fails', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run();
    await ask("/console/api/change", { method: "POST", body: { env: "test", appId: 5, voter: "aaaaaaaaaaaa", verdict: "works" } });
    assert.equal(rows("votes_test")[0].verdict, "works");
    assert.equal(rows()[0].verdict, "fails");
  });
});

describe("removing a vote", () => {
  it("removes that vote and no other", async () => {
    vote(5, "aaaaaaaaaaaa");
    vote(5, "bbbbbbbbbbbb");
    vote(6, "aaaaaaaaaaaa");
    const response = await ask("/console/api/remove", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa" } });
    assert.equal(response.status, 200);
    assert.deepEqual(rows().map((r) => [r.app_id, r.voter]), [[5, "bbbbbbbbbbbb"], [6, "aaaaaaaaaaaa"]]);
  });

  it("refuses a vote that is not there and values that are not exactly known", async () => {
    vote(5, "aaaaaaaaaaaa");
    assert.equal((await ask("/console/api/remove", { method: "POST", body: { env: "prod", appId: 5, voter: "ffffffffffff" } })).status, 404);
    for (const body of [{ env: "prod", appId: 5, voter: "x" }, { env: "prod", appId: 0, voter: "aaaaaaaaaaaa" }, { env: "other", appId: 5, voter: "aaaaaaaaaaaa" }, { appId: 5, voter: "aaaaaaaaaaaa" }]) {
      assert.equal((await ask("/console/api/remove", { method: "POST", body })).status, 400, JSON.stringify(body));
    }
    assert.equal(rows().length, 1);
  });
});

describe("a request that writes must come from the page", () => {
  const body = { env: "prod", appId: 7, device: "quest", verdict: "works" };

  it("refuses another origin, no origin, no header and a body that is not JSON, even with a good token", async () => {
    const refused = [
      { headers: { origin: "https://evil.example" }, page: false, ct: true, mark: true },
      { headers: {}, page: false, ct: true, mark: true },
      { headers: { origin: ORIGIN }, page: false, ct: true, mark: false },
      { headers: { origin: ORIGIN }, page: false, ct: false, mark: true },
    ];
    for (const { headers, ct, mark } of refused) {
      const all = { ...headers };
      if (ct) all["content-type"] = "application/json";
      if (mark) all["x-gameport-console"] = "1";
      const response = await ask("/console/api/add", { method: "POST", body, headers: all, page: false });
      assert.equal(response.status, 403, JSON.stringify(headers));
    }
    assert.deepEqual(rows(), []);
  });

  it("refuses a body that is too large or not an object", async () => {
    assert.equal((await ask("/console/api/add", { method: "POST", body: "x".repeat(5000) })).status, 413);
    assert.equal((await ask("/console/api/add", { method: "POST", body: "not json" })).status, 400);
    assert.equal((await ask("/console/api/add", { method: "POST", body: "[1]" })).status, 400);
    assert.equal((await ask("/console/api/add", { method: "POST", body: "null" })).status, 400);
    assert.equal((await ask("/console/api/add", { method: "GET" })).status, 405);
    assert.deepEqual(rows(), []);
  });
});

describe("the reports", () => {
  const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 250, 255]);
  const report = (table, appId, voter, day, device = "quest") =>
    db.prepare(`INSERT INTO ${table} (app_id, voter, app, device, size, data, updated) VALUES (?, ?, '0.7.4', ?, ?, ?, ?)`).run(appId, voter, device, ZIP.length, ZIP.toString("base64"), day);

  it("tells the device behind a report from the vote of the same player, with its name, or the raw code when the name is not known", async () => {
    vote(5, "aaaaaaaaaaaa");
    vote(5, "bbbbbbbbbbbb");
    db.prepare("UPDATE votes SET model = 'Quest 3', codename = 'eureka' WHERE voter = 'aaaaaaaaaaaa'").run();
    db.prepare("UPDATE votes SET model = 'ZZ-NOT-A-DEVICE' WHERE voter = 'bbbbbbbbbbbb'").run();
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-08");
    report("reports", 5, "bbbbbbbbbbbb", "2026-10-09");
    report("reports", 5, "cccccccccccc", "2026-10-10");
    const { reports } = await (await ask("/console/api/reports?env=prod&appId=5")).json();
    const byDay = Object.fromEntries(reports.map((r) => [r.updated, [r.model, r.deviceName]]));
    assert.deepEqual(byDay["2026-10-08"], ["Quest 3", "Meta Quest 3"]);
    assert.deepEqual(byDay["2026-10-09"], ["ZZ-NOT-A-DEVICE", null]);
    assert.deepEqual(byDay["2026-10-10"], [null, null]);
  });

  it("lists the reports of a game, or the latest of every game, without the zips, newest first", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-08");
    report("reports", 5, "bbbbbbbbbbbb", "2026-10-10", "pico");
    report("reports", 6, "cccccccccccc", "2026-10-09");
    report("reports_test", 5, "dddddddddddd", "2026-10-11");
    const game = await (await ask("/console/api/reports?env=prod&appId=5")).json();
    assert.deepEqual(game.reports.map((r) => [r.appId, r.device, r.updated]), [[5, "pico", "2026-10-10"], [5, "quest", "2026-10-08"]]);
    assert.ok(game.reports.every((r) => r.size === ZIP.length && !("data" in r)));
    const all = await (await ask("/console/api/reports?env=prod")).json();
    assert.deepEqual(all.reports.map((r) => r.appId), [5, 6, 5]);
    assert.equal((await (await ask("/console/api/reports?env=test")).json()).reports.length, 1);
  });

  it("gives a report back as the zip file it is, byte for byte, named for its game", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-08");
    const [{ id }] = (await (await ask("/console/api/reports?env=prod&appId=5")).json()).reports;
    const response = await ask(`/console/api/report?env=prod&id=${id}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/zip");
    assert.equal(response.headers.get("content-disposition"), `attachment; filename="gameport-report-5-${id}.zip"`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), ZIP);
  });

  it("reads the set that was asked, and refuses what is not exactly known", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-08");
    assert.equal((await ask("/console/api/report?env=test&id=1")).status, 404);
    for (const query of ["env=reports&id=1", "id=1", "env=prod", "env=prod&id=0", "env=prod&id=x", "env=prod&id=1.5"]) {
      assert.equal((await ask(`/console/api/report?${query}`)).status, 400, query);
    }
    for (const query of ["env=reports", "env=prod&appId=0", "env=prod&appId=x"]) {
      assert.equal((await ask(`/console/api/reports?${query}`)).status, 400, query);
    }
    assert.equal((await ask("/console/api/report?env=prod&id=1", { method: "POST" })).status, 405);
  });

  it("needs the token like the rest of the console", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-08");
    assert.equal((await ask("/console/api/reports?env=prod", { jwt: null })).status, 404);
    assert.equal((await ask("/console/api/report?env=prod&id=1", { jwt: null })).status, 404);
  });
});

describe("the players", () => {
  const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 250, 255]);
  const report = (table, appId, voter, day) =>
    db.prepare(`INSERT INTO ${table} (app_id, voter, app, device, size, data, updated) VALUES (?, ?, '0.9.1', 'pico', ?, ?, ?)`).run(appId, voter, ZIP.length, ZIP.toString("base64"), day);
  const label = (voter, text, env = "prod") => ask("/console/api/player-label", { method: "POST", body: { env, voter, label: text } });

  it("gives everything one player sent: their answers on every game, their reports and the device behind each", async () => {
    vote(5, "aaaaaaaaaaaa", { device: "pico" });
    vote(6, "aaaaaaaaaaaa", { verdict: "works", device: "pico" });
    vote(5, "bbbbbbbbbbbb");
    db.prepare("UPDATE votes SET model = 'A92Y0', codename = 'sparrow' WHERE voter = 'aaaaaaaaaaaa'").run();
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-09");
    report("reports", 5, "bbbbbbbbbbbb", "2026-10-09");
    const answer = await (await ask("/console/api/player?env=prod&voter=aaaaaaaaaaaa")).json();
    assert.equal(answer.voter, "aaaaaaaaaaaa");
    assert.equal(answer.label, null);
    assert.deepEqual(answer.votes.map((v) => [v.appId, v.verdict, v.deviceName]).sort(), [[5, "fails", "Pico 4 Ultra"], [6, "works", "Pico 4 Ultra"]]);
    assert.deepEqual(answer.reports.map((r) => [r.appId, r.voter, r.deviceName]), [[5, "aaaaaaaaaaaa", "Pico 4 Ultra"]]);
    assert.ok(answer.reports.every((r) => !("data" in r)));
  });

  it("keeps the real set and the test set apart, and refuses a player that is not a hash or a set that is not one", async () => {
    vote(5, "aaaaaaaaaaaa");
    const test = await (await ask("/console/api/player?env=test&voter=aaaaaaaaaaaa")).json();
    assert.deepEqual([test.votes, test.reports], [[], []]);
    for (const query of ["env=prod&voter=nothex000000", "env=prod&voter=aaaaaaaaaaa", "env=prod", "voter=aaaaaaaaaaaa", "env=votes&voter=aaaaaaaaaaaa"]) {
      assert.equal((await ask(`/console/api/player?${query}`)).status, 400, query);
    }
    assert.equal((await ask("/console/api/player?env=prod&voter=aaaaaaaaaaaa", { method: "POST" })).status, 405);
  });

  it("names a player, and the name follows them in the votes, the reports and their page, but only in the set it was given in", async () => {
    vote(5, "aaaaaaaaaaaa");
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-09");
    assert.equal((await label("aaaaaaaaaaaa", "  Some Tester [Team]  ")).status, 200);
    const votes = (await (await ask("/console/api/votes?env=prod&appId=5")).json()).votes;
    assert.equal(votes[0].label, "Some Tester [Team]");
    const reports = (await (await ask("/console/api/reports?env=prod")).json()).reports;
    assert.deepEqual([reports[0].voter, reports[0].label], ["aaaaaaaaaaaa", "Some Tester [Team]"]);
    assert.equal((await (await ask("/console/api/player?env=prod&voter=aaaaaaaaaaaa")).json()).label, "Some Tester [Team]");
    assert.equal((await (await ask("/console/api/player?env=test&voter=aaaaaaaaaaaa")).json()).label, null);
    assert.deepEqual(db.prepare("SELECT voter, label FROM player_labels_test").all(), []);
  });

  it("changes a name, and removes it when it is sent empty or null", async () => {
    await label("aaaaaaaaaaaa", "First");
    await label("aaaaaaaaaaaa", "Second");
    assert.deepEqual(db.prepare("SELECT label FROM player_labels").all().map((r) => r.label), ["Second"]);
    assert.equal((await label("aaaaaaaaaaaa", "   ")).status, 200);
    assert.deepEqual(db.prepare("SELECT label FROM player_labels").all(), []);
    await label("aaaaaaaaaaaa", "Third");
    assert.equal((await label("aaaaaaaaaaaa", null)).status, 200);
    assert.deepEqual(db.prepare("SELECT label FROM player_labels").all(), []);
  });

  it("refuses a name that is too long, has markup or a line break, a player that is not a hash, and a name sent from another site", async () => {
    for (const bad of ["x".repeat(41), "<b>bold</b>", "two\nlines", 12, ["a"]]) {
      assert.equal((await label("aaaaaaaaaaaa", bad)).status, 400, JSON.stringify(bad));
    }
    assert.equal((await label("not-a-hash", "Name")).status, 400);
    assert.equal((await ask("/console/api/player-label", { method: "POST", body: { env: "prod", voter: "aaaaaaaaaaaa", label: "Name" }, page: false, headers: { origin: "https://evil.example", "content-type": "application/json", "x-gameport-console": "1" } })).status, 403);
    assert.deepEqual(db.prepare("SELECT * FROM player_labels").all(), []);
  });

  it("keeps the name out of the journal", async () => {
    const lines = [];
    const original = console.log;
    console.log = (line) => lines.push(String(line));
    try {
      await label("aaaaaaaaaaaa", "Secret Name");
    } finally {
      console.log = original;
    }
    assert.ok(lines.some((line) => line.includes("player-label-set") && line.includes("aaaaaaaaaaaa")));
    assert.ok(lines.every((line) => !line.includes("Secret Name")));
  });

  it("is added by its migration to a database that lacks the tables, and the migration runs twice without harm", () => {
    const old = new DatabaseSync(":memory:");
    old.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replace(/CREATE TABLE IF NOT EXISTS player_labels(_test)?[^;]*;/g, ""));
    assert.equal(old.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'player_labels%'").get().n, 0);
    for (let i = 0; i < 2; i++) old.exec(readFileSync(new URL("./migrations/0015_player_labels.sql", import.meta.url), "utf8"));
    assert.equal(old.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'player_labels%'").get().n, 2);
    old.prepare("INSERT INTO player_labels (voter, label, updated) VALUES ('aaaaaaaaaaaa', 'x', '2026-10-27')").run();
    old.exec(readFileSync(new URL("./migrations/0015_player_labels.sql", import.meta.url), "utf8"));
    assert.equal(old.prepare("SELECT label FROM player_labels").get().label, "x");
  });

  it("serves the page at the address of a player, and only for a hash", async () => {
    assert.equal((await ask("/console/prod/player/aaaaaaaaaaaa")).status, 200);
    assert.equal((await ask("/console/test/player/0123456789ab")).status, 200);
    assert.equal((await ask("/console/prod/player/AAAAAAAAAAAA")).status, 404);
    assert.equal((await ask("/console/prod/player/aaaaaaaaaaa")).status, 404);
    assert.equal((await ask("/console/prod/player/")).status, 404);
  });
});

describe("the name of an app that is not in the catalog", () => {
  const real = globalThis.fetch;
  let asked;
  const steam = (id, data) => {
    asked = [];
    globalThis.fetch = async (url) => {
      asked.push(String(url));
      return new Response(JSON.stringify({ [id]: data }), { status: 200 });
    };
  };
  const restore = () => { globalThis.fetch = real; };

  it("asks Steam for the name of that one number, and keeps the answer", async () => {
    steam(4527850, { success: true, data: { type: "demo", name: "A Demo", header_image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4527850/header.jpg" } });
    try {
      const first = await (await ask("/console/api/app?id=4527850")).json();
      assert.deepEqual(first, { id: 4527850, name: "A Demo", type: "demo", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4527850/header.jpg" });
      assert.deepEqual(asked, ["https://store.steampowered.com/api/appdetails?appids=4527850&filters=basic&cc=us&l=english"]);
      await ask("/console/api/app?id=4527850");
      assert.equal(asked.length, 1, "the second time it is kept");
    } finally { restore(); }
  });

  it("gives no name when Steam does not know the app, and no image that is not Steam's", async () => {
    steam(4527851, { success: false });
    try {
      assert.deepEqual(await (await ask("/console/api/app?id=4527851")).json(), { id: 4527851, name: null, type: null, image: null, why: "steam does not know this app" });
      steam(4527852, { success: true, data: { type: "game", name: "X", header_image: "https://evil.example/x.jpg" } });
      assert.equal((await (await ask("/console/api/app?id=4527852")).json()).image, null);
    } finally { restore(); }
  });

  it("does not fail when Steam does not answer", async () => {
    globalThis.fetch = async () => { throw new Error("down"); };
    try {
      assert.deepEqual(await (await ask("/console/api/app?id=4527853")).json(), { id: 4527853, name: null, type: null, image: null, why: "steam did not answer" });
    } finally { restore(); }
  });

  it("does not keep a failure: the next look asks Steam again, and says why it failed", async () => {
    globalThis.fetch = async () => new Response("blocked", { status: 403 });
    try {
      assert.equal((await (await ask("/console/api/app?id=4527854")).json()).why, "steam answered 403");
      steam(4527854, { success: true, data: { type: "demo", name: "Now known", header_image: null } });
      assert.equal((await (await ask("/console/api/app?id=4527854")).json()).name, "Now known");
      assert.equal(asked.length, 1);
    } finally { restore(); }
  });

  it("only takes a number, and only with the token", async () => {
    steam(1, { success: false });
    try {
      for (const query of ["", "id=", "id=0", "id=x", "id=1.5", "id=3000000000", "id=1%2F..%2Fsecret", "id=1&appids=2"].slice(0, 7)) {
        assert.equal((await ask(`/console/api/app?${query}`)).status, 400, query);
      }
      assert.equal((await ask("/console/api/app?id=5", { jwt: null })).status, 404);
      assert.equal((await ask("/console/api/app?id=5", { method: "POST" })).status, 405);
      assert.deepEqual(asked, []);
    } finally { restore(); }
  });
});

describe("the reports that wait, and the answer each goes with", () => {
  const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  const report = (table, appId, voter, day, handled = null) =>
    db.prepare(`INSERT INTO ${table} (app_id, voter, app, device, size, data, updated, handled) VALUES (?, ?, '0.8.1', 'quest', ?, ?, ?, ?)`).run(appId, voter, ZIP.length, ZIP.toString("base64"), day, handled);
  const vote = (table, appId, voter, verdict, offline = 0) =>
    db.prepare(`INSERT INTO ${table} (app_id, voter, verdict, app, game, device, offline, updated) VALUES (?, ?, ?, '0.8.1', NULL, 'quest', ?, '2026-10-12')`).run(appId, voter, verdict, offline);
  const list = async (query = "env=prod") => (await ask(`/console/api/reports?${query}`)).json();

  it("tells for each report what the same player answered for that game, and null when there is no vote", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-12");
    report("reports", 5, "bbbbbbbbbbbb", "2026-10-11");
    report("reports", 6, "cccccccccccc", "2026-10-10");
    vote("votes", 5, "aaaaaaaaaaaa", "fails");
    vote("votes", 5, "bbbbbbbbbbbb", "works", 1);
    vote("votes", 6, "dddddddddddd", "fails");
    const { reports } = await list();
    assert.deepEqual(reports.map((r) => [r.appId, r.verdict, r.offline]), [[5, "fails", false], [5, "works", true], [6, null, null]]);
  });

  it("matches the vote of the same set only: a test report does not read a real vote", async () => {
    report("reports_test", 5, "aaaaaaaaaaaa", "2026-10-12");
    vote("votes", 5, "aaaaaaaaaaaa", "fails");
    vote("votes_test", 5, "aaaaaaaaaaaa", "works");
    assert.equal((await list("env=test")).reports[0].verdict, "works");
  });

  it("puts the reports that wait first, counts them all, and shows the day of the others", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-12", "2026-10-12");
    report("reports", 6, "bbbbbbbbbbbb", "2026-10-09");
    report("reports", 7, "cccccccccccc", "2026-10-11");
    const answer = await list();
    assert.equal(answer.unhandled, 2);
    assert.deepEqual(answer.reports.map((r) => [r.appId, r.handled]), [[7, null], [6, null], [5, "2026-10-12"]]);
    assert.equal((await list("env=prod&appId=5")).unhandled, 2, "the count is of the set, not of the game");
    assert.equal((await list("env=test")).unhandled, 0);
  });

  it("marks a report as handled, keeps the first day, and puts it back to waiting", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-12");
    const today = new Date().toISOString().slice(0, 10);
    const id = (await list()).reports[0].id;
    const handle = (handled) => ask("/console/api/report-handled", { method: "POST", body: { env: "prod", id, handled } });
    assert.equal((await handle(true)).status, 200);
    assert.equal((await list()).reports[0].handled, today);
    db.prepare("UPDATE reports SET handled = '2026-01-02'").run();
    await handle(true);
    assert.equal((await list()).reports[0].handled, "2026-01-02");
    await handle(false);
    const after = await list();
    assert.equal(after.reports[0].handled, null);
    assert.equal(after.unhandled, 1);
  });

  it("marks a report of the set that was asked, and refuses what is not exactly known", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-12");
    report("reports_test", 5, "aaaaaaaaaaaa", "2026-10-12");
    assert.equal((await ask("/console/api/report-handled", { method: "POST", body: { env: "test", id: 1, handled: true } })).status, 200);
    assert.deepEqual([rows("reports")[0].handled, rows("reports_test")[0].handled === null], [null, false]);
    const bad = [{ env: "prod", id: 0, handled: true }, { env: "prod", id: "1", handled: true }, { env: "prod", id: 1.5, handled: true }, { env: "prod", id: 1, handled: "yes" }, { env: "prod", id: 1 }, { env: "reports", id: 1, handled: true }, { id: 1, handled: true }];
    for (const body of bad) assert.equal((await ask("/console/api/report-handled", { method: "POST", body })).status, 400, JSON.stringify(body));
    assert.equal((await ask("/console/api/report-handled", { method: "POST", body: { env: "prod", id: 99, handled: true } })).status, 404);
    assert.equal(rows("reports")[0].handled, null);
  });

  it("needs the token and the page, like every write", async () => {
    report("reports", 5, "aaaaaaaaaaaa", "2026-10-12");
    const body = { env: "prod", id: 1, handled: true };
    assert.equal((await ask("/console/api/report-handled", { method: "POST", body, jwt: null })).status, 404);
    assert.equal((await ask("/console/api/report-handled", { method: "POST", body, page: false })).status, 403);
    assert.equal(rows("reports")[0].handled, null);
  });

  it("starts a player's new report again as waiting", async () => {
    const send = () => worker.fetch(new Request(`${ORIGIN}/report?appId=5&app=0.8.1&device=quest&voter=${VOTER}`, { method: "POST", body: ZIP }), env);
    await send();
    const { reports } = await list();
    await ask("/console/api/report-handled", { method: "POST", body: { env: "prod", id: reports[0].id, handled: true } });
    assert.notEqual((await list()).reports[0].handled, null);
    await send();
    assert.equal((await list()).reports[0].handled, null);
  });

  it("adds the column to a database made before it, and keeps its reports", () => {
    const old = new DatabaseSync(":memory:");
    old.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replaceAll(/^\s*handled +TEXT.*\n/gm, ""));
    old.prepare("INSERT INTO reports (app_id, voter, app, device, size, data, updated) VALUES (1, 'aaaaaaaaaaaa', '0.7.4', 'quest', 4, 'UEsD', '2026-10-08')").run();
    old.exec(readFileSync(new URL("./migrations/0005_reports_handled.sql", import.meta.url), "utf8"));
    assert.deepEqual({ ...old.prepare("SELECT app_id, voter, handled FROM reports").get() }, { app_id: 1, voter: "aaaaaaaaaaaa", handled: null });
  });
});

describe("the list of incompatible games", () => {
  const reason = { id: "anti-tamper", title: { en: "Protected against modification", fr: "Protégé contre la modification" }, text: { en: "the game closes itself after a few seconds.", fr: "le jeu se ferme de lui-même au bout de quelques secondes." } };
  const post = (path, body) => ask(`/console/api/${path}`, { method: "POST", body });
  const setReason = (extra = {}, environment = "prod") => post("reason-set", { env: environment, ...reason, ...extra });
  const setGame = (extra = {}, environment = "prod") => post("incompatible-set", { env: environment, appId: 438100, name: "Some game", reason: "anti-tamper", ...extra });
  const publicList = async (path = "/incompatible") => (await worker.fetch(new Request(`${ORIGIN}${path}`), env)).json();

  it("is empty until the developer adds a reason and a game, and the list is public", async () => {
    assert.deepEqual(await publicList(), { v: 1, reasons: {}, games: [] });
    assert.equal((await setReason()).status, 200);
    assert.equal((await setGame()).status, 200);
    assert.deepEqual(await publicList(), {
      v: 1,
      reasons: { "anti-tamper": { title: reason.title, text: reason.text } },
      games: [{ appId: 438100, name: "Some game", reason: "anti-tamper" }],
    });
  });

  it("refuses a game whose reason does not exist, and never takes a text for a game", async () => {
    assert.equal((await setGame({ reason: "nope" })).status, 400);
    await setReason();
    assert.equal((await setGame({ reason: "Bad Id" })).status, 400);
    assert.equal((await setGame({ reason: undefined })).status, 400);
    assert.deepEqual((await publicList()).games, []);
  });

  it("keeps the real list and the test list apart", async () => {
    await setReason({}, "test");
    await setGame({}, "test");
    assert.deepEqual((await publicList()).games, []);
    assert.equal((await publicList("/test/incompatible")).games.length, 1);
  });

  it("changing the texts of a reason reaches every game that names it", async () => {
    await setReason();
    await setGame();
    await setGame({ appId: 5, name: "Other" });
    await setReason({ title: { en: "Crashes", fr: "Plante" } });
    const list = await publicList();
    assert.equal(list.reasons["anti-tamper"].title.fr, "Plante");
    assert.equal(list.games.length, 2);
  });

  it("a game changes reason, and is taken off when it works", async () => {
    await setReason();
    await setReason({ id: "crash", title: { en: "Crashes", fr: "Plante" } });
    await setGame();
    await setGame({ reason: "crash" });
    assert.equal((await publicList()).games[0].reason, "crash");
    assert.equal((await post("incompatible-remove", { env: "prod", appId: 438100 })).status, 200);
    assert.deepEqual((await publicList()).games, []);
    assert.equal((await post("incompatible-remove", { env: "prod", appId: 438100 })).status, 404);
  });

  it("a reason that a game still names cannot be deleted; an unused one can", async () => {
    await setReason();
    await setGame();
    assert.equal((await post("reason-remove", { env: "prod", id: "anti-tamper" })).status, 409);
    await post("incompatible-remove", { env: "prod", appId: 438100 });
    assert.equal((await post("reason-remove", { env: "prod", id: "anti-tamper" })).status, 200);
    assert.deepEqual((await publicList()).reasons, {});
  });

  it("refuses a reason with a missing language, a semicolon, markup or a bad identifier", async () => {
    for (const bad of [{ title: { en: "x" } }, { text: { en: "a; b", fr: "c" } }, { text: { en: "<b>", fr: "c" } }, { id: "A b" }, { id: "" }, { title: "x" }]) {
      assert.equal((await setReason(bad)).status, 400, JSON.stringify(bad));
    }
    assert.deepEqual((await publicList()).reasons, {});
  });

  it("is written only from the console's own page and only by the signed-in developer", async () => {
    const body = { env: "prod", ...reason };
    assert.equal((await ask("/console/api/reason-set", { method: "POST", body, page: false })).status, 403);
    assert.equal((await ask("/console/api/reason-set", { method: "POST", body, jwt: "" })).status, 404);
    assert.deepEqual((await publicList()).reasons, {});
  });

  it("is read by the console, with how many games name each reason", async () => {
    await setReason();
    await setGame();
    const answer = await (await ask("/console/api/incompatible?env=prod")).json();
    assert.equal(answer.reasons[0].uses, 1);
    assert.equal(answer.games[0].reason, "anti-tamper");
    assert.equal((await ask("/console/api/incompatible?env=nope")).status, 400);
  });
});

describe("what is new", () => {
  const news = async (environment = "prod") => (await ask(`/console/api/news?env=${environment}`)).json();
  const seen = (what, environment = "prod") => ask("/console/api/seen", { method: "POST", body: { env: environment, what } });
  const hour = (offset = 0) => `${new Date(Date.now() + offset * 3600_000).toISOString().slice(0, 13)}:00:00Z`;
  const stamped = (appId, voter, votedAt, updated, verdict = "fails") => db.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated, voted_at) VALUES (?, ?, ?, '0.7.2', NULL, 'quest', 0, ?, ?)")
    .run(appId, voter, verdict, updated, votedAt);

  it("is stamped by the relay's clock when a player votes, rounded down to the hour, whatever the app sends", async () => {
    const message = { v: 1, appId: 5, voter: "0123456789abcdef0123456789abcdef", verdict: "works", app: "0.9.0", device: "quest", at: "1999-01-01T00:00:00Z" };
    const response = await worker.fetch(new Request(`${ORIGIN}/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(message) }), env);
    assert.equal(response.status, 204);
    assert.equal(rows()[0].voted_at, hour());
    assert.match(rows()[0].voted_at, /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/);
  });

  it("starts at now the first time, so the old votes are not news, and then counts what came after", async () => {
    stamped(5, "aaaaaaaaaaaa", hour(-30), "2026-10-01");
    const first = await news();
    assert.equal(first.votes.count, 0);
    assert.equal(first.votesSince, hour(1));
    stamped(5, "bbbbbbbbbbbb", hour(1), "2026-10-13", "works");
    stamped(6, "cccccccccccc", hour(2), "2026-10-13", "fails");
    stamped(7, "dddddddddddd", hour(), "2026-10-13", "fails");
    const later = await news();
    assert.deepEqual({ count: later.votes.count, works: later.votes.works, fails: later.votes.fails }, { count: 2, works: 1, fails: 1 });
    assert.deepEqual(later.votes.games.map((g) => g.appId).sort(), [5, 6]);
  });

  it("tells a vote without a time by its day, and a vote with a time by its hour", async () => {
    await news();
    const today = new Date().toISOString().slice(0, 10);
    stamped(1, "aaaaaaaaaaaa", null, "2000-01-01");
    stamped(2, "bbbbbbbbbbbb", null, "2999-01-01");
    stamped(5, "eeeeeeeeeeee", null, today);
    stamped(3, "cccccccccccc", hour(-5), today);
    stamped(4, "dddddddddddd", hour(1), today);
    const result = await news();
    assert.deepEqual(result.votes.games.map((g) => g.appId).sort(), [2, 4]);
  });

  it("is cleared by marking as seen, for one set at a time, and games have their own day", async () => {
    await news();
    await news("test");
    stamped(5, "aaaaaaaaaaaa", hour(1), "2026-10-13");
    db.prepare("INSERT INTO votes_test (app_id, voter, verdict, app, game, device, offline, updated, voted_at) VALUES (5, 'bbbbbbbbbbbb', 'works', '0.7.2', NULL, 'quest', 0, '2026-10-13', ?)").run(hour(1));
    assert.equal((await news()).votes.count, 1);
    assert.equal((await news("test")).votes.count, 1);
    db.prepare("UPDATE console_seen SET at = '2000-01-01' WHERE name = 'games'").run();
    assert.equal((await news()).gamesSince, "2000-01-01");
    assert.equal((await seen("votes")).status, 200);
    assert.equal(db.prepare("SELECT at FROM console_seen WHERE name = 'votes-prod'").get().at, hour(1));
    db.prepare("UPDATE console_seen SET at = ? WHERE name = 'votes-prod'").run(hour(2));
    assert.equal((await news()).votes.count, 0);
    assert.equal((await news("test")).votes.count, 1);
    assert.equal((await seen("games")).status, 200);
    assert.equal((await news()).gamesSince, new Date().toISOString().slice(0, 10));
  });

  it("refuses what is not exactly known, and needs the token and the page", async () => {
    assert.equal((await ask("/console/api/news?env=votes")).status, 400);
    assert.equal((await ask("/console/api/news?env=prod", { jwt: null })).status, 404);
    assert.equal((await seen("votes", "nope")).status, 400);
    assert.equal((await seen("something")).status, 400);
    assert.equal((await ask("/console/api/seen", { method: "POST", page: false, body: { env: "prod", what: "votes" } })).status, 403);
  });

  it("adds the column and the table to a database made before them, and keeps its votes", () => {
    const old = new DatabaseSync(":memory:");
    old.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replaceAll(/^\s*voted_at +TEXT.*\n/gm, "").replace(/CREATE TABLE IF NOT EXISTS console_seen[\s\S]*?\);/, ""));
    old.prepare("INSERT INTO votes (app_id, voter, verdict, app, game, device, offline, updated) VALUES (1, 'aaaaaaaaaaaa', 'works', '0.7.2', NULL, 'quest', 0, '2026-10-08')").run();
    old.exec(readFileSync(new URL("./migrations/0009_voted_at.sql", import.meta.url), "utf8"));
    assert.deepEqual({ ...old.prepare("SELECT app_id, voter, voted_at FROM votes").get() }, { app_id: 1, voter: "aaaaaaaaaaaa", voted_at: null });
    assert.equal(old.prepare("SELECT COUNT(*) AS n FROM console_seen").get().n, 0);
  });
});
