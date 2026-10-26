// The relay between GamePort and the compatibility file: it takes the verdict a player gave about a game ("it worked" / "it did not"),
// keeps one vote per player and per game in a small database, and publishes the totals. It stores no name, no address, no log of who sent what.
// After "it did not work" the app also sends a technical report (a zip, already redacted by the app); the relay keeps the latest one per player
// and per game for 30 days, and only the developer, with a secret token, can read them. See README.md.

import { handleConsole } from "./console.js";
import { deviceLabel } from "./device_names.js";
import { ISSUES, ISSUE_SET } from "./issues.js";
import { notifyReport, notifyVote } from "./notify.js";

// "offline_only": the game works, but only without the network (its online or multiplayer part does not).
const VERDICTS = new Set(["works", "offline_only", "fails"]);
const DEVICES = new Set(["quest", "pico", "phone", "tablet", "other"]);
export { ISSUES };
const MAX_BODY_BYTES = 1024;
// A report is a zip of text; a row of the database holds 2 MB at most, and the zip is stored as base64 (a third larger).
const MAX_REPORT_BYTES = 1_000_000;
const REPORT_DAYS = 30;
const MAX_APP_ID = 2_000_000_000;

/** What a device calls itself: a short plain name (letters, digits, space and . _ + - / ( )). Anything else is no name. */
export function deviceName(value) {
  return typeof value === "string" && /^[0-9A-Za-z][0-9A-Za-z ._+\-\/()]{0,39}$/.test(value.trim()) ? value.trim() : null;
}

/** Checks a message from the app. Returns {vote} with only the known fields, or {error}. Anything else is refused, never repaired. */
export function validate(message) {
  if (message === null || typeof message !== "object" || Array.isArray(message)) return { error: "not an object" };
  if (message.v !== 1) return { error: "unknown version" };
  if (!Number.isInteger(message.appId) || message.appId < 1 || message.appId > MAX_APP_ID) return { error: "bad appId" };
  if (!VERDICTS.has(message.verdict)) return { error: "bad verdict" };
  if (typeof message.app !== "string" || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(message.app)) return { error: "bad app version" };
  if (!DEVICES.has(message.device)) return { error: "bad device" };
  if (typeof message.voter !== "string" || !/^[0-9a-f]{32}$/.test(message.voter)) return { error: "bad voter" };
  if (message.game !== undefined && (typeof message.game !== "string" || !/^[0-9A-Za-z._-]{1,32}$/.test(message.game))) return { error: "bad game" };
  if (message.offline !== undefined && typeof message.offline !== "boolean") return { error: "bad offline" };
  if (message.issues !== undefined && (!Array.isArray(message.issues) || message.issues.length > 32 || message.issues.some((code) => typeof code !== "string"))) return { error: "bad issues" };
  const vote = { appId: message.appId, verdict: message.verdict, app: message.app, device: message.device, voter: message.voter };
  // The model and the codename of the device as it names itself (Build.MODEL, Build.DEVICE): a value that is not a plain short name is left out, never a reason to lose the vote.
  const model = deviceName(message.model);
  const codename = deviceName(message.codename);
  if (model) vote.model = model;
  if (codename) vote.codename = codename;
  if (message.game !== undefined) vote.game = message.game;
  // "Worked offline" only means something for a game that worked: a vote that says it did not work never carries it.
  vote.offline = message.offline === true && message.verdict === "works";
  // What went wrong only means something for an answer that says something did; a code this version does not know (a newer app) is left out, not refused.
  vote.issues = message.verdict === "works" ? [] : ISSUES.filter((code) => (message.issues ?? []).includes(code));
  return { vote };
}

/** The voter is stored as a short hash, so the id the app keeps is never in the database. */
export async function voterHash(voter, salt) {
  const bytes = new TextEncoder().encode(`${salt ?? ""}${voter}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

/** Checks the facts that come with a report, in the address. Returns {meta} or {error}. */
export function validateReportMeta(params) {
  const appId = Number(params.get("appId"));
  if (!Number.isInteger(appId) || appId < 1 || appId > MAX_APP_ID) return { error: "bad appId" };
  const app = params.get("app");
  if (typeof app !== "string" || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(app)) return { error: "bad app version" };
  const device = params.get("device");
  if (!DEVICES.has(device)) return { error: "bad device" };
  const voter = params.get("voter");
  if (typeof voter !== "string" || !/^[0-9a-f]{32}$/.test(voter)) return { error: "bad voter" };
  return { meta: { appId, app, device, voter } };
}

/** A zip starts with "PK\x03\x04": anything else is not a report. */
export function looksLikeZip(bytes) {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function toBase64(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

function fromBase64(text) {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// The routes and the table each one reads and writes. The names of the tables come from here and from nowhere else, never from a message.
const ROUTES = {
  "/vote": { table: "votes", write: true },
  "/summary": { table: "votes", write: false },
  "/test/vote": { table: "votes_test", write: true },
  "/test/summary": { table: "votes_test", write: false },
  "/report": { table: "reports", report: true },
  "/test/report": { table: "reports_test", report: true },
  "/incompatible": { table: "incompatible", reasons: "incompatible_reasons", list: true },
  "/test/incompatible": { table: "incompatible_test", reasons: "incompatible_reasons_test", list: true },
};
// What only the developer reads: the list of reports and each report. The route says which table (the real one or the test one).
const ADMIN = { "/admin/reports": "reports", "/admin/test/reports": "reports_test" };

// The columns a database may or may not have yet: level 2 has the model and the codename too (migration 0013), level 1 has the issues (0011), level 0 has neither.
const upsert = (table, level = 2) => `INSERT INTO ${table} (app_id, voter, verdict, app, game, device, offline, updated, voted_at${level >= 1 ? ", issues" : ""}${level >= 2 ? ", model, codename" : ""}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${level >= 1 ? ", ?" : ""}${level >= 2 ? ", ?, ?" : ""})
  ON CONFLICT (app_id, voter) DO UPDATE SET verdict = excluded.verdict, app = excluded.app, game = excluded.game, device = excluded.device, offline = excluded.offline, updated = excluded.updated, voted_at = excluded.voted_at${level >= 1 ? ", issues = excluded.issues" : ""}${level >= 2 ? ", model = excluded.model, codename = excluded.codename" : ""}, fixed = NULL, fixed_in = NULL`;

/** The relay's own clock, UTC, rounded down to the hour: the app never sends a time, and none of a player's is used. */
export const thisHour = (now = new Date()) => `${now.toISOString().slice(0, 13)}:00:00Z`;
// A vote marked as fixed counts as "works": the problem it reported was solved, whatever it said.
const summaryQuery = (table) => `SELECT app_id AS appId, device, SUM(verdict = 'works') AS works, SUM(verdict = 'offline_only') AS offlineOnly, SUM(verdict = 'fails') AS fails, SUM(verdict = 'works' AND offline = 1) AS worksOffline FROM (SELECT app_id, device, offline, CASE WHEN fixed IS NULL THEN verdict ELSE 'works' END AS verdict FROM ${table}) GROUP BY app_id, device ORDER BY app_id, device`;

function reply(status, body, headers = {}) {
  const json = body !== undefined && typeof body === "object";
  return new Response(json ? JSON.stringify(body) : null, { status, headers: json ? { "content-type": "application/json", ...headers } : headers });
}

async function vote(request, env, table, ctx) {
  // One player cannot flood the database: the limit is per address, and the address is used for nothing else.
  if (env.LIMITER) {
    const { success } = await env.LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" });
    if (!success) return reply(429, { error: "too many votes" });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return reply(413, { error: "too large" });
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return reply(400, { error: "not json" });
  }
  const { vote: checked, error } = validate(message);
  if (error) return reply(400, { error });
  const voter = await voterHash(checked.voter, env.VOTER_SALT);
  const today = new Date().toISOString().slice(0, 10);
  const values = [checked.appId, voter, checked.verdict, checked.app, checked.game ?? null, checked.device, checked.offline ? 1 : 0, today, thisHour()];
  const issues = checked.issues.length ? checked.issues.join(",") : null;
  const attempts = [
    [2, [...values, issues, checked.model ?? null, checked.codename ?? null]],
    // A database that has not had the migration of the model yet, or that of the issues: the vote is saved without what it cannot hold, which is better than no vote.
    [1, [...values, issues]],
    [0, values],
  ];
  let saved = false;
  for (const [level, args] of attempts) {
    try {
      await env.DB.prepare(upsert(table, level)).bind(...args).run();
      saved = true;
      break;
    } catch {
      // The next try holds less.
    }
  }
  // What the database said stays here: the player only learns that it did not work.
  if (!saved) return reply(500, { error: "not saved" });
  // Each set tells its own channel: the real votes the real one, the test set the one for tries.
  if (table === "votes" || table === "votes_test") notifyVote(env, ctx, new URL(request.url).origin, checked, table === "votes" ? "prod" : "test");
  return reply(204);
}

async function report(request, env, table, ctx) {
  if (env.LIMITER) {
    const { success } = await env.LIMITER.limit({ key: `report:${request.headers.get("CF-Connecting-IP") ?? "unknown"}` });
    if (!success) return reply(429, { error: "too many reports" });
  }
  const { meta, error } = validateReportMeta(new URL(request.url).searchParams);
  if (error) return reply(400, { error });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_REPORT_BYTES) return reply(413, { error: "too large" });
  if (!looksLikeZip(bytes)) return reply(400, { error: "not a zip" });
  const voter = await voterHash(meta.voter, env.VOTER_SALT);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const oldest = new Date(now.getTime() - REPORT_DAYS * 86_400_000).toISOString().slice(0, 10);
  try {
    await env.DB.prepare(`INSERT INTO ${table} (app_id, voter, app, device, size, data, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (app_id, voter) DO UPDATE SET app = excluded.app, device = excluded.device, size = excluded.size, data = excluded.data, updated = excluded.updated, handled = NULL`)
      .bind(meta.appId, voter, meta.app, meta.device, bytes.length, toBase64(bytes), today).run();
    await env.DB.prepare(`DELETE FROM ${table} WHERE updated < ?`).bind(oldest).run();
  } catch {
    return reply(500, { error: "not saved" });
  }
  if (table === "reports" || table === "reports_test") {
    const environment = table === "reports" ? "prod" : "test";
    const votes = table === "reports" ? "votes" : "votes_test";
    let answer = null;
    let id = 0;
    try {
      const [own] = (await env.DB.prepare(`SELECT verdict FROM ${votes} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).all()).results;
      answer = own ? own.verdict : null;
      const [saved] = (await env.DB.prepare(`SELECT id FROM ${table} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).all()).results;
      id = saved ? saved.id : 0;
    } catch {
      // The report is told without the player's answer, and without its link.
    }
    notifyReport(env, ctx, new URL(request.url).origin, { id, appId: meta.appId, app: meta.app, device: meta.device, size: bytes.length }, answer, environment);
  }
  return reply(204);
}

/** True when the request carries the developer's token. No token set in the relay means nobody can read. */
async function isDeveloper(request, env) {
  const given = request.headers.get("authorization") ?? "";
  if (!env.ADMIN_TOKEN || !given.startsWith("Bearer ")) return false;
  const [a, b] = await Promise.all([given.slice(7), env.ADMIN_TOKEN].map(async (t) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))));
  return a.every((byte, i) => byte === b[i]);
}

async function admin(request, env, table, id) {
  if (!(await isDeveloper(request, env))) return reply(404, { error: "not found" });
  try {
    if (id === undefined) {
      const rows = (await env.DB.prepare(`SELECT id, app_id AS appId, app, device, size, updated FROM ${table} ORDER BY updated DESC, id DESC`).all()).results;
      return reply(200, { reports: rows });
    }
    const [row] = (await env.DB.prepare(`SELECT app_id AS appId, data FROM ${table} WHERE id = ?`).bind(id).all()).results;
    if (!row) return reply(404, { error: "not found" });
    return new Response(fromBase64(row.data), { status: 200, headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="gameport-report-${row.appId}-${id}.zip"` } });
  } catch {
    return reply(500, { error: "not read" });
  }
}

/** The totals per game, nothing about any player. The compatibility file is built from this. */
async function summary(env, table) {
  let rows;
  let fixes;
  try {
    rows = (await env.DB.prepare(summaryQuery(table)).all()).results;
    fixes = (await env.DB.prepare(`SELECT DISTINCT app_id AS appId, device, fixed AS day, fixed_in AS version FROM ${table} WHERE fixed IS NOT NULL ORDER BY app_id, device, fixed, fixed_in`).all()).results;
  } catch {
    return reply(500, { error: "not read" });
  }
  // One game, with its totals and the same totals for each kind of device: "it works on a Quest" is not "it works on a phone".
  const byGame = new Map();
  for (const row of rows) {
    const game = byGame.get(row.appId) ?? { appId: row.appId, works: 0, offlineOnly: 0, fails: 0, worksOffline: 0, devices: {} };
    game.works += row.works;
    game.offlineOnly += row.offlineOnly;
    game.fails += row.fails;
    game.worksOffline += row.worksOffline;
    game.devices[row.device] = { works: row.works, offlineOnly: row.offlineOnly, fails: row.fails, worksOffline: row.worksOffline };
    byGame.set(row.appId, game);
  }
  // What players ticked as going wrong, counted for the game and for each kind of device: the votes that are still a problem only (a fixed one counts as "works").
  // A database that has not had the migration of the issues yet has none to count: the summary is the same as before.
  let issueRows = [];
  try {
    // With the model when the database has it (migration 0013), to count the problems for each model too.
    try {
      issueRows = (await env.DB.prepare(`SELECT app_id AS appId, device, model, issues FROM ${table} WHERE fixed IS NULL AND issues IS NOT NULL AND issues <> ''`).all()).results;
    } catch {
      issueRows = (await env.DB.prepare(`SELECT app_id AS appId, device, issues FROM ${table} WHERE fixed IS NULL AND issues IS NOT NULL AND issues <> ''`).all()).results;
    }
  } catch {
    issueRows = [];
  }
  for (const row of issueRows) {
    const game = byGame.get(row.appId);
    if (!game) continue;
    for (const code of String(row.issues).split(",")) {
      if (!ISSUE_SET.has(code)) continue;
      game.issues = { ...game.issues, [code]: (game.issues?.[code] ?? 0) + 1 };
      const device = game.devices[row.device];
      if (device) device.issues = { ...device.issues, [code]: (device.issues?.[code] ?? 0) + 1 };
    }
  }
  // The models the votes came from, for the game and each kind of device: how many said it works, partly works or fails (a fixed vote counts as "works"). Nothing to count before the migration of the models.
  try {
    const modelRows = (await env.DB.prepare(`SELECT app_id AS appId, device, model, SUM(verdict = 'works') AS works, SUM(verdict = 'offline_only') AS offlineOnly, SUM(verdict = 'fails') AS fails FROM (SELECT app_id, device, model, CASE WHEN fixed IS NULL THEN verdict ELSE 'works' END AS verdict FROM ${table} WHERE model IS NOT NULL AND model <> '') GROUP BY app_id, device, model ORDER BY app_id, device, model`).all()).results;
    for (const row of modelRows) {
      const device = byGame.get(row.appId)?.devices[row.device];
      if (device) (device.models ??= {})[row.model] = { works: row.works, offlineOnly: row.offlineOnly, fails: row.fails, ...(deviceLabel(row.model, null) ? { name: deviceLabel(row.model, null) } : {}) };
    }
  } catch {
    // No model column yet.
  }
  // The problems ticked for each model, next to its counts.
  for (const row of issueRows) {
    const model = row.model ? byGame.get(row.appId)?.devices[row.device]?.models?.[row.model] : null;
    if (!model) continue;
    for (const code of String(row.issues).split(",")) {
      if (ISSUE_SET.has(code)) model.issues = { ...model.issues, [code]: (model.issues?.[code] ?? 0) + 1 };
    }
  }
  // The day a problem was solved, and in which version when it is known: shown on the site, and counted as "works" above.
  for (const fix of fixes) {
    const game = byGame.get(fix.appId);
    if (!game) continue;
    (game.fixes ??= []).push(fix.version ? { device: fix.device, day: fix.day, version: fix.version } : { device: fix.device, day: fix.day });
  }
  return reply(200, { v: 1, games: [...byGame.values()] }, { "cache-control": "public, max-age=300" });
}

/** The games confirmed as incompatible, and the reasons they name (title and explanation in each language). Nothing about any player. */
async function incompatibleList(env, table, reasonsTable) {
  let games;
  let reasons;
  try {
    games = (await env.DB.prepare(`SELECT app_id AS appId, name, reason FROM ${table} ORDER BY app_id`).all()).results;
    reasons = (await env.DB.prepare(`SELECT id, title_en, title_fr, text_en, text_fr FROM ${reasonsTable} ORDER BY id`).all()).results;
  } catch {
    return reply(500, { error: "not read" });
  }
  const byId = Object.fromEntries(reasons.map((r) => [r.id, { title: { en: r.title_en, fr: r.title_fr }, text: { en: r.text_en, fr: r.text_fr } }]));
  return reply(200, { v: 1, reasons: byId, games }, { "cache-control": "public, max-age=300" });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    // The developer's console answers its own routes (see console.js); to everyone else they do not exist.
    const consoleAnswer = await handleConsole(request, env, ctx);
    if (consoleAnswer) return consoleAnswer;
    const developerRoute = Object.keys(ADMIN).find((base) => path === base || path.startsWith(`${base}/`));
    if (developerRoute) {
      if (!env.DB) return reply(500, { error: "relay not configured" });
      if (request.method !== "GET") return reply(405, { error: "use GET" });
      const rest = path.slice(developerRoute.length + 1);
      if (rest !== "" && !/^\d{1,9}$/.test(rest)) return reply(404, { error: "not found" });
      return admin(request, env, ADMIN[developerRoute], rest === "" ? undefined : Number(rest));
    }
    const route = ROUTES[path];
    if (!route) return reply(404, { error: "not found" });
    if (!env.DB) return reply(500, { error: "relay not configured" });
    if (route.list) return request.method === "GET" ? incompatibleList(env, route.table, route.reasons) : reply(405, { error: "use GET" });
    if (route.report) return request.method === "POST" ? report(request, env, route.table, ctx) : reply(405, { error: "use POST" });
    if (!route.write) return request.method === "GET" ? summary(env, route.table) : reply(405, { error: "use GET" });
    return request.method === "POST" ? vote(request, env, route.table, ctx) : reply(405, { error: "use POST" });
  },
};
