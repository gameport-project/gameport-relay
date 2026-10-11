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
    assert.deepEqual({ ...stored, voter: undefined }, { app_id: 7, voter: undefined, verdict: "works", app: "admin", game: null, device: "pico", offline: 1, updated: new Date().toISOString().slice(0, 10), fixed: null, fixed_in: null });
    assert.deepEqual(await summary("/test/summary"), [{ appId: 7, works: 1, offlineOnly: 0, fails: 0, worksOffline: 1, devices: { pico: { works: 1, offlineOnly: 0, fails: 0, worksOffline: 1 } } }]);
    assert.deepEqual(await summary(), []);
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

  it("marks a vote as fixed: it is no longer counted, and nothing else is touched", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "fails" });
    vote(5, "bbbbbbbbbbbb", { verdict: "works" });
    assert.equal((await summary())[0].fails, 1);
    const response = await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: true, fixedIn: "0.9.0" } });
    assert.equal(response.status, 200);
    const today = new Date().toISOString().slice(0, 10);
    assert.deepEqual(rows().map((r) => [r.voter, r.fixed, r.fixed_in]), [["aaaaaaaaaaaa", today, "0.9.0"], ["bbbbbbbbbbbb", null, null]]);
    const [game] = await summary();
    assert.deepEqual([game.works, game.fails], [1, 0]);
  });

  it("keeps the first day it was marked, even when it is marked again", async () => {
    vote(5, "aaaaaaaaaaaa");
    db.prepare("UPDATE votes SET fixed = '2026-01-02' WHERE voter = 'aaaaaaaaaaaa'").run();
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: true } });
    assert.equal(rows()[0].fixed, "2026-01-02");
  });

  it("counts a vote again, and forgets where it was fixed", async () => {
    vote(5, "aaaaaaaaaaaa", { verdict: "fails" });
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: true, fixedIn: "0.9.0" } });
    assert.deepEqual(await summary(), []);
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter: "aaaaaaaaaaaa", fixed: false } });
    assert.deepEqual([rows()[0].fixed, rows()[0].fixed_in], [null, null]);
    assert.equal((await summary())[0].fails, 1);
  });

  it("lets a player who votes again count again: a vote marked fixed is a vote like another when it is renewed", async () => {
    await worker.fetch(new Request(`${ORIGIN}/vote`, { method: "POST", body: JSON.stringify({ v: 1, appId: 5, verdict: "fails", app: "0.7.2", device: "quest", voter: VOTER }) }), env);
    const voter = rows()[0].voter;
    await ask("/console/api/change", { method: "POST", body: { env: "prod", appId: 5, voter, fixed: true, fixedIn: "0.9.0" } });
    assert.deepEqual(await summary(), []);
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
    assert.equal((await ask("/console/api/add", { method: "POST", body: "x".repeat(3000) })).status, 413);
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
