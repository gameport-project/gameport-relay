// The developer's console: a page and a few routes to see, add, change, mark as fixed and remove the votes, for the real totals and for the test ones.
//
// It is for one person, and everything about it is shut by default:
//  - Cloudflare Access stands in front of /console and decides who may come in (see README.md). The relay does not trust that alone: every request must carry the
//    signed token Access adds, and the relay checks its signature, its audience, its issuer, its end date and, when set, the e-mail address it was made for.
//  - A request that writes must come from the page itself (same origin, a header no other site can add, a JSON body).
//  - What a route reads and writes is chosen by the route, from two names written here, never from a message.
// Without the three secrets (ACCESS_TEAM, ACCESS_AUD, ADMIN_EMAIL), nothing here answers: every route is a 404, as if it did not exist.

import { consolePage } from "./console_page.js";
import { voterHash } from "./worker.js";

const VERDICTS = new Set(["works", "offline_only", "fails"]);
const DEVICES = new Set(["quest", "pico", "phone", "tablet", "other"]);
const MAX_APP_ID = 2_000_000_000;
const MAX_BODY_BYTES = 4096;
// The two sets of votes the console reaches. The names come from here and from nowhere else.
const TABLES = { prod: "votes", test: "votes_test" };
// The technical reports a player's app sent after "it did not work", for the same two sets.
const REPORT_TABLES = { prod: "reports", test: "reports_test" };
// The votes each set of reports goes with: a report and the vote of the same player for the same game share the app and the hashed player.
const VOTE_OF_REPORTS = { reports: "votes", reports_test: "votes_test" };
const MAX_REPORTS_LISTED = 200;
// The games confirmed as incompatible, for the same two sets.
const INCOMPATIBLE_TABLES = { prod: { games: "incompatible", reasons: "incompatible_reasons" }, test: { games: "incompatible_test", reasons: "incompatible_reasons_test" } };
const HEADER = "x-gameport-console";

const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });
const notFound = () => new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "content-type": "application/json" } });

const b64url = (text) => Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(text.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const decode = (part) => JSON.parse(new TextDecoder().decode(b64url(part)));

let cachedKeys = { at: 0, keys: [] };

/** The public keys Cloudflare signs the tokens with: kept ten minutes. The tests give them in ACCESS_JWKS instead. */
async function signingKeys(env, now) {
  if (env.ACCESS_JWKS) return JSON.parse(env.ACCESS_JWKS).keys;
  if (now - cachedKeys.at < 600_000 && cachedKeys.keys.length) return cachedKeys.keys;
  const answer = await fetch(`https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!answer.ok) return [];
  cachedKeys = { at: now, keys: (await answer.json()).keys ?? [] };
  return cachedKeys.keys;
}

/** True when the request carries a valid token from Cloudflare Access, made for this application and for the developer's address. */
export async function isSignedIn(request, env, now = Date.now()) {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD || !env.ADMIN_EMAIL) return false;
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = decode(parts[0]);
    const payload = decode(parts[1]);
    if (header.alg !== "RS256") return false;
    const jwk = (await signingKeys(env, now)).find((key) => key.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), signed))) return false;
    const seconds = Math.floor(now / 1000);
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audience.includes(env.ACCESS_AUD)) return false;
    if (payload.iss !== `https://${env.ACCESS_TEAM}.cloudflareaccess.com`) return false;
    if (typeof payload.exp !== "number" || payload.exp <= seconds) return false;
    if (typeof payload.nbf === "number" && payload.nbf > seconds + 60) return false;
    return typeof payload.email === "string" && payload.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

/** Reads a vote's fields from a message, checks each one, and refuses what is not exactly known. Returns {fields} or {error}. */
export function checkVote(message, { partial }) {
  const fields = {};
  if (message.verdict !== undefined) {
    if (!VERDICTS.has(message.verdict)) return { error: "bad verdict" };
    fields.verdict = message.verdict;
  } else if (!partial) return { error: "bad verdict" };
  if (message.device !== undefined) {
    if (!DEVICES.has(message.device)) return { error: "bad device" };
    fields.device = message.device;
  } else if (!partial) return { error: "bad device" };
  if (message.offline !== undefined) {
    if (typeof message.offline !== "boolean") return { error: "bad offline" };
    fields.offline = message.offline;
  }
  return { fields };
}

const validId = (appId) => Number.isInteger(appId) && appId >= 1 && appId <= MAX_APP_ID;
const validVoter = (voter) => typeof voter === "string" && /^[0-9a-f]{12}$/.test(voter);
const validFixedIn = (text) => text === null || (typeof text === "string" && /^[0-9A-Za-z._ -]{1,32}$/.test(text));

const SELECT = (table) => `SELECT app_id AS appId, voter, verdict, app, game, device, offline, updated, fixed, fixed_in AS fixedIn FROM ${table}`;

function log(action, detail) {
  // The journal of what was changed: Cloudflare keeps the logs of the relay. Nothing about the person is in it.
  console.log(JSON.stringify({ console: action, ...detail }));
}

async function body(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { error: "too large", status: 413 };
  try {
    const message = JSON.parse(text);
    if (message === null || typeof message !== "object" || Array.isArray(message)) return { error: "not an object", status: 400 };
    return { message };
  } catch {
    return { error: "not json", status: 400 };
  }
}

/** A request that writes comes from the console's own page: its own origin, a header another site cannot add, and a JSON body. */
function fromThePage(request) {
  if (request.headers.get(HEADER) !== "1") return false;
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return false;
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

async function list(url, env) {
  const table = TABLES[url.searchParams.get("env")];
  const appId = Number(url.searchParams.get("appId"));
  if (!table) return json(400, { error: "bad env" });
  if (!validId(appId)) return json(400, { error: "bad appId" });
  const rows = (await env.DB.prepare(`${SELECT(table)} WHERE app_id = ? ORDER BY updated DESC, voter`).bind(appId).all()).results;
  return json(200, { votes: rows.map((row) => ({ ...row, offline: row.offline === 1 })) });
}

async function add(message, env, table, environment) {
  if (!validId(message.appId)) return json(400, { error: "bad appId" });
  const { fields, error } = checkVote(message, { partial: false });
  if (error) return json(400, { error });
  // A vote of its own, as if a player had sent it: a random id that nobody keeps, hashed with the same salt.
  const random = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const voter = await voterHash(random, env.VOTER_SALT);
  const today = new Date().toISOString().slice(0, 10);
  const offline = fields.offline === true && fields.verdict === "works" ? 1 : 0;
  await env.DB.prepare(`INSERT INTO ${table} (app_id, voter, verdict, app, game, device, offline, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(message.appId, voter, fields.verdict, "admin", null, fields.device, offline, today).run();
  log("add", { env: environment, appId: message.appId, voter, verdict: fields.verdict, device: fields.device });
  return json(200, { voter });
}

async function change(message, env, table, environment) {
  if (!validId(message.appId)) return json(400, { error: "bad appId" });
  if (!validVoter(message.voter)) return json(400, { error: "bad voter" });
  const { fields, error } = checkVote(message, { partial: true });
  if (error) return json(400, { error });
  if (message.fixed !== undefined && typeof message.fixed !== "boolean") return json(400, { error: "bad fixed" });
  if (message.fixedIn !== undefined && !validFixedIn(message.fixedIn)) return json(400, { error: "bad fixedIn" });
  const [row] = (await env.DB.prepare(`${SELECT(table)} WHERE app_id = ? AND voter = ?`).bind(message.appId, message.voter).all()).results;
  if (!row) return json(404, { error: "no such vote" });
  const verdict = fields.verdict ?? row.verdict;
  const device = fields.device ?? row.device;
  // "Worked offline" only means something for a vote that says it worked.
  const offline = verdict === "works" && (fields.offline ?? row.offline === 1) ? 1 : 0;
  let fixed = row.fixed;
  let fixedIn = row.fixedIn;
  if (message.fixed === true) fixed = row.fixed ?? new Date().toISOString().slice(0, 10);
  if (message.fixed === false) { fixed = null; fixedIn = null; }
  if (message.fixedIn !== undefined && fixed !== null) fixedIn = message.fixedIn;
  await env.DB.prepare(`UPDATE ${table} SET verdict = ?, device = ?, offline = ?, fixed = ?, fixed_in = ? WHERE app_id = ? AND voter = ?`)
    .bind(verdict, device, offline, fixed, fixedIn, message.appId, message.voter).run();
  log("change", { env: environment, appId: message.appId, voter: message.voter, before: { verdict: row.verdict, device: row.device, fixed: row.fixed }, after: { verdict, device, fixed } });
  return json(200, { ok: true });
}

async function remove(message, env, table, environment) {
  if (!validId(message.appId)) return json(400, { error: "bad appId" });
  if (!validVoter(message.voter)) return json(400, { error: "bad voter" });
  const [row] = (await env.DB.prepare(`${SELECT(table)} WHERE app_id = ? AND voter = ?`).bind(message.appId, message.voter).all()).results;
  if (!row) return json(404, { error: "no such vote" });
  await env.DB.prepare(`DELETE FROM ${table} WHERE app_id = ? AND voter = ?`).bind(message.appId, message.voter).run();
  log("remove", { env: environment, appId: message.appId, voter: message.voter, was: { verdict: row.verdict, device: row.device, fixed: row.fixed } });
  return json(200, { ok: true });
}

// What Steam says of an app that is not in the catalog (a demo, a game without an Android version): kept an hour, in the memory of the relay.
const appNames = new Map();
const NAME_TTL_MS = 3_600_000;

/**
 * The name of an app, from Steam's public store. Only a number reaches the address, so nothing else can be asked. An answer that has a name is kept an hour;
 * one that has none (Steam refused, was slow or does not know the app) is not kept, so the next look asks again, and says why in `why`.
 */
async function appInfo(url) {
  const id = Number(url.searchParams.get("id"));
  if (!validId(id)) return json(400, { error: "bad id" });
  const kept = appNames.get(id);
  if (kept && Date.now() - kept.at < NAME_TTL_MS) return json(200, kept.info);
  const nothing = (why) => json(200, { id, name: null, type: null, image: null, why });
  let answer;
  try {
    answer = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic&cc=us&l=english`, {
      headers: { "user-agent": "gameport-relay", accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return nothing("steam did not answer");
  }
  if (!answer.ok) return nothing(`steam answered ${answer.status}`);
  let data;
  try {
    data = (await answer.json())[String(id)];
  } catch {
    return nothing("steam did not answer with data");
  }
  if (!data || !data.success || !data.data || typeof data.data.name !== "string") return nothing("steam does not know this app");
  const image = typeof data.data.header_image === "string" && /^https:\/\/[a-z0-9.-]+\.steamstatic\.com\//.test(data.data.header_image) ? data.data.header_image : null;
  const info = { id, name: data.data.name.slice(0, 200), type: typeof data.data.type === "string" ? data.data.type : null, image };
  appNames.set(id, { at: Date.now(), info });
  return json(200, info);
}

const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/**
 * The reports of a game, or the latest ones of every game when no game is given, the ones not handled first. Not the zips: those are downloaded one by one.
 * Each report carries the answer of the same player for the same game (it may have changed since the report was sent), and the answer is null when the
 * player has no vote. `unhandled` counts every report still waiting in the set, not only the ones listed.
 */
async function listReports(url, env) {
  const table = REPORT_TABLES[url.searchParams.get("env")];
  if (!table) return json(400, { error: "bad env" });
  const given = url.searchParams.get("appId");
  const appId = given === null ? null : Number(given);
  if (appId !== null && !validId(appId)) return json(400, { error: "bad appId" });
  const votes = VOTE_OF_REPORTS[table];
  const where = appId === null ? "" : " WHERE r.app_id = ?";
  const statement = env.DB.prepare(
    `SELECT r.id, r.app_id AS appId, r.app, r.device, r.size, r.updated, r.handled, v.verdict, v.offline FROM ${table} r LEFT JOIN ${votes} v ON v.app_id = r.app_id AND v.voter = r.voter${where} ` +
    `ORDER BY r.handled IS NOT NULL, r.updated DESC, r.id DESC LIMIT ${MAX_REPORTS_LISTED}`,
  );
  const rows = (await (appId === null ? statement.all() : statement.bind(appId).all())).results;
  const [{ n }] = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE handled IS NULL`).all()).results;
  return json(200, { unhandled: n, reports: rows.map((row) => ({ ...row, verdict: row.verdict ?? null, offline: row.verdict === null || row.verdict === undefined ? null : row.offline === 1 })) });
}

/** Marks a report as handled (the day), or as waiting again. */
async function handleReport(message, env, _table, environment) {
  const table = REPORT_TABLES[environment];
  if (!Number.isInteger(message.id) || message.id < 1) return json(400, { error: "bad id" });
  if (typeof message.handled !== "boolean") return json(400, { error: "bad handled" });
  const [row] = (await env.DB.prepare(`SELECT id, app_id AS appId, handled FROM ${table} WHERE id = ?`).bind(message.id).all()).results;
  if (!row) return json(404, { error: "no such report" });
  const day = message.handled ? (row.handled ?? new Date().toISOString().slice(0, 10)) : null;
  await env.DB.prepare(`UPDATE ${table} SET handled = ? WHERE id = ?`).bind(day, message.id).run();
  log("report", { env: environment, id: message.id, appId: row.appId, handled: day });
  return json(200, { ok: true });
}

/** One report as the zip file it is, to be saved. */
async function downloadReport(url, env) {
  const table = REPORT_TABLES[url.searchParams.get("env")];
  const id = Number(url.searchParams.get("id"));
  if (!table) return json(400, { error: "bad env" });
  if (!Number.isInteger(id) || id < 1) return json(400, { error: "bad id" });
  const [row] = (await env.DB.prepare(`SELECT app_id AS appId, data FROM ${table} WHERE id = ?`).bind(id).all()).results;
  if (!row) return json(404, { error: "no such report" });
  const name = `gameport-report-${row.appId}-${id}.zip`;
  return new Response(fromBase64(row.data), {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

const LANGUAGES = ["en", "fr"];
/** A title or an explanation: text in each language, written for any reader, so no semicolon and no line break. */
function checkTexts(value, max) {
  if (value === null || typeof value !== "object") return null;
  const out = {};
  for (const language of LANGUAGES) {
    const text = typeof value[language] === "string" ? value[language].trim() : "";
    if (!text || text.length > max || /[;\n\r<>]/.test(text)) return null;
    out[language] = text;
  }
  return out;
}

const validReasonId = (id) => typeof id === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) && id.length <= 40;

/** The reasons (with how many games name each) and the games on the list, for the chosen set. */
async function listIncompatible(url, env) {
  const tables = INCOMPATIBLE_TABLES[url.searchParams.get("env")];
  if (!tables) return json(400, { error: "bad env" });
  const reasons = (await env.DB.prepare(`SELECT r.id, r.title_en, r.title_fr, r.text_en, r.text_fr, (SELECT COUNT(*) FROM ${tables.games} g WHERE g.reason = r.id) AS uses FROM ${tables.reasons} r ORDER BY r.id`).all()).results;
  const games = (await env.DB.prepare(`SELECT app_id AS appId, name, reason, updated FROM ${tables.games} ORDER BY name`).all()).results;
  return json(200, {
    reasons: reasons.map((r) => ({ id: r.id, title: { en: r.title_en, fr: r.title_fr }, text: { en: r.text_en, fr: r.text_fr }, uses: r.uses })),
    games,
  });
}

/** Adds a reason, or changes its texts: every game that names it shows the new texts at once. */
async function setReason(message, env, _table, environment) {
  const tables = INCOMPATIBLE_TABLES[environment];
  if (!validReasonId(message.id)) return json(400, { error: "bad id" });
  const title = checkTexts(message.title, 80);
  if (!title) return json(400, { error: "bad title" });
  const text = checkTexts(message.text, 400);
  if (!text) return json(400, { error: "bad text" });
  await env.DB.prepare(`INSERT INTO ${tables.reasons} (id, title_en, title_fr, text_en, text_fr) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET title_en = excluded.title_en, title_fr = excluded.title_fr, text_en = excluded.text_en, text_fr = excluded.text_fr`)
    .bind(message.id, title.en, title.fr, text.en, text.fr).run();
  log("reason-set", { env: environment, id: message.id });
  return json(200, { ok: true });
}

/** Removes a reason that no game names any more. */
async function removeReason(message, env, _table, environment) {
  const tables = INCOMPATIBLE_TABLES[environment];
  if (!validReasonId(message.id)) return json(400, { error: "bad id" });
  const [used] = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${tables.games} WHERE reason = ?`).bind(message.id).all()).results;
  if (used.n > 0) return json(409, { error: "games still name this reason" });
  await env.DB.prepare(`DELETE FROM ${tables.reasons} WHERE id = ?`).bind(message.id).run();
  log("reason-remove", { env: environment, id: message.id });
  return json(200, { ok: true });
}

/** Adds a game to the incompatible list with one of the reasons, or changes its reason. */
async function setIncompatible(message, env, _table, environment) {
  const tables = INCOMPATIBLE_TABLES[environment];
  if (!validId(message.appId)) return json(400, { error: "bad appId" });
  const name = typeof message.name === "string" ? message.name.trim() : "";
  if (!name || name.length > 200 || /[<>]/.test(name)) return json(400, { error: "bad name" });
  if (!validReasonId(message.reason)) return json(400, { error: "bad reason" });
  const [known] = (await env.DB.prepare(`SELECT id FROM ${tables.reasons} WHERE id = ?`).bind(message.reason).all()).results;
  if (!known) return json(400, { error: "unknown reason" });
  const today = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(`INSERT INTO ${tables.games} (app_id, name, reason, updated) VALUES (?, ?, ?, ?)
    ON CONFLICT (app_id) DO UPDATE SET name = excluded.name, reason = excluded.reason, updated = excluded.updated`)
    .bind(message.appId, name, message.reason, today).run();
  log("incompatible-set", { env: environment, appId: message.appId, name, reason: message.reason });
  return json(200, { ok: true });
}

/** Takes a game off the incompatible list: from then on the app and the site no longer say so. */
async function removeIncompatible(message, env, _table, environment) {
  const tables = INCOMPATIBLE_TABLES[environment];
  if (!validId(message.appId)) return json(400, { error: "bad appId" });
  const [row] = (await env.DB.prepare(`SELECT name FROM ${tables.games} WHERE app_id = ?`).bind(message.appId).all()).results;
  if (!row) return json(404, { error: "not on the list" });
  await env.DB.prepare(`DELETE FROM ${tables.games} WHERE app_id = ?`).bind(message.appId).run();
  log("incompatible-remove", { env: environment, appId: message.appId, name: row.name });
  return json(200, { ok: true });
}

const WRITES = { "/console/api/add": add, "/console/api/change": change, "/console/api/remove": remove, "/console/api/report-handled": handleReport, "/console/api/incompatible-set": setIncompatible, "/console/api/reason-set": setReason, "/console/api/reason-remove": removeReason, "/console/api/incompatible-remove": removeIncompatible };

/** The routes of the console. Returns a response, or null when the path is not one of the console's. */
export async function handleConsole(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/console" && !url.pathname.startsWith("/console/")) return null;
  if (!(await isSignedIn(request, env))) return notFound();
  if (!env.DB) return json(500, { error: "relay not configured" });
  try {
    if (url.pathname === "/console" || url.pathname === "/console/") {
      if (request.method !== "GET") return json(405, { error: "use GET" });
      const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
      return new Response(consolePage(nonce), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
          "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self' https://raw.githubusercontent.com; img-src https://*.steamstatic.com data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
        },
      });
    }
    if (url.pathname === "/console/api/votes") return request.method === "GET" ? await list(url, env) : json(405, { error: "use GET" });
    if (url.pathname === "/console/api/app") return request.method === "GET" ? await appInfo(url) : json(405, { error: "use GET" });
    if (url.pathname === "/console/api/incompatible") return request.method === "GET" ? await listIncompatible(url, env) : json(405, { error: "use GET" });
    if (url.pathname === "/console/api/reports") return request.method === "GET" ? await listReports(url, env) : json(405, { error: "use GET" });
    if (url.pathname === "/console/api/report") return request.method === "GET" ? await downloadReport(url, env) : json(405, { error: "use GET" });
    const write = WRITES[url.pathname];
    if (!write) return notFound();
    if (request.method !== "POST") return json(405, { error: "use POST" });
    if (!fromThePage(request)) return json(403, { error: "not from the console" });
    const { message, error, status } = await body(request);
    if (error) return json(status, { error });
    const table = TABLES[message.env];
    if (!table) return json(400, { error: "bad env" });
    return await write(message, env, table, message.env);
  } catch {
    return json(500, { error: "not done" });
  }
}
