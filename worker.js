// The relay between GamePort and the compatibility file: it takes the verdict a player gave about a game ("it worked" / "it did not"),
// keeps one vote per player and per game in a small database, and publishes the totals. It stores no name, no address, no log of who sent what.
// After "it did not work" the app also sends a technical report (a zip, already redacted by the app); the relay keeps the latest one per player
// and per game for 30 days, and only the developer, with a secret token, can read them. See README.md.

import { handleConsole } from "./console.js";
import { deviceLabel } from "./device_names.js";
import { ISSUES, ISSUE_SET } from "./issues.js";
import { notifyReport, notifyVote } from "./notify.js";
import { compareVersions, fixedSince, parseVersion, turnsOf } from "./turns.js";

// "offline_only": the game works, but only without the network (its online or multiplayer part does not).
const VERDICTS = new Set(["works", "offline_only", "fails"]);
// What became of the report that goes with an answer, as the app tells it: `sent` (the relay has it), `waiting` (kept on the device, no network or the relay busy), `refused` (the relay will
// not take it) and `none` (there is none: the game is not installed, or the report is too large).
export const REPORT_STATES = new Set(["sent", "waiting", "refused", "none"]);
// What the developer can tell the app about a game, from the console: the setting, and the values it takes. The app reads them on a public route (ids and words only) and applies them
// where the player did not choose; a setting that is not here is refused by the console and never published.
export const GAME_SETTINGS = { passthrough: new Set(["on"]) };
const DEVICES = new Set(["quest", "pico", "phone", "tablet", "other"]);
export { ISSUES };
const MAX_BODY_BYTES = 1024;
// A report is a zip of text. A row of the database holds 2 MB at most and the zip is stored as base64 (a third larger), so a zip of more than CHUNK_BYTES is cut into parts,
// each in a row of its own: the largest report accepted still fits.
// A release is "0.9.1"; a test build of the CI adds its own mark, "0.9.1-alpha.2".
const APP_VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}(-alpha\.\d{1,5})?$/;
const MAX_REPORT_BYTES = 2_000_000;
const CHUNK_BYTES = 600_000;
// The table of parts that goes with each table of reports. The names come from here and from nowhere else.
const PARTS = { reports: "report_parts", reports_test: "report_parts_test" };
const REPORT_DAYS = 30;
/** Fewer seconds of measured play than this say nothing about a game: the hook of GamePort gives no number below it, and the relay keeps none. */
export const MIN_PERF_SECONDS = 180;
/** How many players must have sent their numbers before a model shows a figure: one player is not a statistic. */
export const MIN_PERF_PLAYERS = 3;
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
  if (typeof message.app !== "string" || !APP_VERSION.test(message.app)) return { error: "bad app version" };
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
  // The Discord name the player chose to give, to talk about their answers: present (empty when they have none or took it away) or absent for an app that does not say. Never a reason to lose the vote.
  if (typeof message.discord === "string") vote.discord = cleanDiscordName(message.discord) ?? "";
  // "Worked offline" only means something for a game that worked: a vote that says it did not work never carries it.
  vote.offline = message.offline === true && message.verdict === "works";
  // What went wrong only means something for an answer that says something did; a code this version does not know (a newer app) is left out, not refused.
  vote.issues = message.verdict === "works" ? [] : ISSUES.filter((code) => (message.issues ?? []).includes(code));
  // What became of the technical report the app sent just before this answer: only for an answer that says something went wrong, and a state this version does not know is left out.
  if (message.verdict !== "works" && REPORT_STATES.has(message.report)) vote.report = message.report;
  // How steadily the game ran, when the player agreed to send it: three whole numbers that make sense together, else left out (never a reason to lose the vote).
  const perf = message.perf;
  if (perf !== null && typeof perf === "object" && !Array.isArray(perf)
    && Number.isInteger(perf.seconds) && Number.isInteger(perf.held) && Number.isInteger(perf.target)
    && perf.seconds >= MIN_PERF_SECONDS && perf.seconds <= 86_400 && perf.held >= 0 && perf.held <= perf.seconds && perf.target >= 24 && perf.target <= 240) {
    vote.perf = { seconds: perf.seconds, held: perf.held, target: perf.target };
  }
  return { vote };
}

/**
 * The figure for a group of players who sent how steadily the game ran at the same frame rate: how many they are and the middle player's share of seconds that held it (percent:
 * one player who played for hours does not weigh more than the others). [rows] are {seconds, held}, never empty.
 */
export function performanceOf(rows) {
  const shares = rows.map((row) => Math.round((100 * row.held) / row.seconds)).sort((a, b) => a - b);
  const middle = shares.length >> 1;
  const pct = shares.length % 2 ? shares[middle] : Math.round((shares[middle - 1] + shares[middle]) / 2);
  return { n: rows.length, pct };
}

/**
 * One figure for each frame rate the screens asked for: a player can run the same game at 72, 90 or 120 frames a second (an app such as QGO changes it), and those are not the same
 * thing to hold. A frame rate shows only from MIN_PERF_PLAYERS players; the one most players ran comes first, then the higher. [rows] are {seconds, held, target}.
 */
export function performanceByTarget(rows) {
  const byTarget = new Map();
  for (const row of rows) byTarget.set(row.target, [...(byTarget.get(row.target) ?? []), row]);
  return [...byTarget.entries()]
    .filter(([, list]) => list.length >= MIN_PERF_PLAYERS)
    .map(([target, list]) => ({ target, ...performanceOf(list) }))
    .sort((a, b) => b.n - a.n || b.target - a.target);
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
  if (typeof app !== "string" || !APP_VERSION.test(app)) return { error: "bad app version" };
  const device = params.get("device");
  if (!DEVICES.has(device)) return { error: "bad device" };
  const voter = params.get("voter");
  if (typeof voter !== "string" || !/^[0-9a-f]{32}$/.test(voter)) return { error: "bad voter" };
  // The answer the player gave with this report, when the app says it: the answer itself reaches the relay just after the report, so the report cannot read it from the votes yet. Never a reason to refuse the report.
  const answer = params.get("answer");
  return { meta: { appId, app, device, voter, ...(VERDICTS.has(answer) ? { answer } : {}) } };
}

const MAX_DISCORD_NAME = 40;

/**
 * The Discord name a player typed, made safe to keep and to show: no control character or angle bracket, no leading "@", at most 40 characters. Null when nothing is left. It is
 * text the player chose to give, to talk about a report: it is never a reason to refuse the report, and nothing checks that it belongs to them.
 */
export function cleanDiscordName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().replace(/^@+/, "").trim().slice(0, MAX_DISCORD_NAME).trim();
  return name.length > 0 ? name : null;
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

/** The zip of a report: whole in its row, or put together from its parts. Null when there is no such report. */
export async function readReport(env, table, id) {
  const [row] = (await env.DB.prepare(`SELECT app_id AS appId, data FROM ${table} WHERE id = ?`).bind(id).all()).results;
  if (!row) return null;
  if (row.data !== "") return { appId: row.appId, bytes: fromBase64(row.data) };
  const parts = (await env.DB.prepare(`SELECT data FROM ${PARTS[table]} WHERE report_id = ? ORDER BY seq`).bind(id).all()).results;
  if (!parts.length) return null;
  const pieces = parts.map((part) => fromBase64(part.data));
  const bytes = new Uint8Array(pieces.reduce((sum, piece) => sum + piece.length, 0));
  let at = 0;
  for (const piece of pieces) {
    bytes.set(piece, at);
    at += piece.length;
  }
  return { appId: row.appId, bytes };
}

// The routes and the table each one reads and writes. The names of the tables come from here and from nowhere else, never from a message.
const ROUTES = {
  "/vote": { table: "votes", write: true },
  "/summary": { table: "votes", write: false },
  "/test/vote": { table: "votes_test", write: true },
  "/test/summary": { table: "votes_test", write: false },
  "/report": { table: "reports", report: true },
  "/test/report": { table: "reports_test", report: true },
  "/game-defaults": { table: "game_defaults", defaults: true },
  "/test/game-defaults": { table: "game_defaults_test", defaults: true },
  "/incompatible": { table: "incompatible", reasons: "incompatible_reasons", list: true },
  "/test/incompatible": { table: "incompatible_test", reasons: "incompatible_reasons_test", list: true },
};
// The reports of one game, listed for its details: the route says which table (the real votes or the test ones).
const GAME_REPORTS = { "/reports": "votes", "/test/reports": "votes_test" };
// What only the developer reads: the list of reports and each report. The route says which table (the real one or the test one).
const ADMIN = { "/admin/reports": "reports", "/admin/test/reports": "reports_test" };

// The columns a database may or may not have yet: level 3 has the state of the report too (migration 0017), level 2 the model and the codename (0013), level 1 the issues (0011), level 0 none.
const upsert = (table, level = 3) => `INSERT INTO ${table} (app_id, voter, verdict, app, game, device, offline, updated, voted_at${level >= 1 ? ", issues" : ""}${level >= 2 ? ", model, codename" : ""}${level >= 3 ? ", report_state" : ""}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${level >= 1 ? ", ?" : ""}${level >= 2 ? ", ?, ?" : ""}${level >= 3 ? ", ?" : ""})
  ON CONFLICT (app_id, voter) DO UPDATE SET verdict = excluded.verdict, app = excluded.app, game = excluded.game, device = excluded.device, offline = excluded.offline, updated = excluded.updated, voted_at = excluded.voted_at${level >= 1 ? ", issues = excluded.issues" : ""}${level >= 2 ? ", model = excluded.model, codename = excluded.codename" : ""}${level >= 3 ? ", report_state = excluded.report_state" : ""}, fixed = NULL, fixed_in = NULL`;

// Where each set of votes is written: every answer is a line of its history; what is read is the view of the same name as the set (the last line of each player and game).
export const HISTORY = { votes: "vote_history", votes_test: "vote_history_test" };
// The Discord name each player typed, for the same two sets: read by the console only.
export const CONTACTS = { votes: "player_contacts", votes_test: "player_contacts_test" };

/**
 * Records an answer in the history of the player for the game: a new line when the answer, the version of GamePort or the build of the game is not what the last line says, else the
 * last line is renewed (a game that does not work is asked about again every day, and the same answer again is not a new fact). A renewed answer counts again, as before: it is no
 * longer marked as fixed. Returns false when the database has no history yet (migration 0019): the answer is then saved the old way.
 */
async function recordVote(env, table, values, issues, checked) {
  const history = HISTORY[table];
  const [appId, voter, verdict, app, game, device, offline, today, hour] = values;
  const more = [issues, checked.model ?? null, checked.codename ?? null, checked.report ?? null];
  const perf = [checked.perf?.seconds ?? null, checked.perf?.held ?? null, checked.perf?.target ?? null];
  // A database that has not had migration 0020 cannot hold the numbers of the performance: the answer is then saved without them, which is better than none.
  for (const withPerf of [true, false]) {
    try {
      const [last] = (await env.DB.prepare(`SELECT id, verdict, app, game FROM ${history} WHERE app_id = ? AND voter = ? ORDER BY id DESC LIMIT 1`).bind(appId, voter).all()).results;
      if (last && last.verdict === verdict && last.app === app && (last.game ?? null) === game) {
        // A renewed answer that comes without the numbers keeps the ones the player sent before.
        await env.DB.prepare(`UPDATE ${history} SET device = ?, offline = ?, updated = ?, voted_at = ?, issues = ?, model = ?, codename = ?, report_state = ?${withPerf ? ", perf_seconds = COALESCE(?, perf_seconds), perf_held = COALESCE(?, perf_held), perf_target = COALESCE(?, perf_target)" : ""}, fixed = NULL, fixed_in = NULL WHERE id = ?`)
          .bind(device, offline, today, hour, ...more, ...(withPerf ? perf : []), last.id).run();
      } else {
        await env.DB.prepare(`INSERT INTO ${history} (app_id, voter, verdict, app, game, device, offline, updated, voted_at, issues, model, codename, report_state${withPerf ? ", perf_seconds, perf_held, perf_target" : ""}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${withPerf ? ", ?, ?, ?" : ""})`)
          .bind(appId, voter, verdict, app, game, device, offline, today, hour, ...more, ...(withPerf ? perf : [])).run();
        await markFirstDay(env, history, appId, voter, today);
      }
      return true;
    } catch {
      // The next try holds less.
    }
  }
  return false;
}

/**
 * The day a line of the history began: kept apart from `updated`, which a renewed answer moves forward, so the first sight of a player on a version and the day an answer was
 * first given stay known. A database that has not had migration 0023 has no such column: nothing is kept, and the answer is never lost for it.
 */
async function markFirstDay(env, history, appId, voter, today) {
  try {
    await env.DB.prepare(`UPDATE ${history} SET first_day = ? WHERE id = (SELECT MAX(id) FROM ${history} WHERE app_id = ? AND voter = ?)`).bind(today, appId, voter).run();
  } catch {
    // No column for it yet.
  }
}

/**
 * Keeps the Discord name the player typed, one per player (not per game): every answer that carries one renews it, an empty one takes it away. It goes in a table of its own that only
 * the console reads, never in the votes the site and the totals are made from. A database that has not had migration 0022 has no such table: nothing is kept, and the answer is never lost for it.
 */
async function saveContact(env, table, voter, discord) {
  const contacts = CONTACTS[table];
  try {
    if (discord === "") await env.DB.prepare(`DELETE FROM ${contacts} WHERE voter = ?`).bind(voter).run();
    else await env.DB.prepare(`INSERT INTO ${contacts} (voter, discord, updated) VALUES (?, ?, ?) ON CONFLICT (voter) DO UPDATE SET discord = excluded.discord, updated = excluded.updated`).bind(voter, discord, new Date().toISOString().slice(0, 10)).run();
  } catch {
    // No table for it yet.
  }
}

/** The relay's own clock, UTC, rounded down to the hour: the app never sends a time, and none of a player's is used. */
export const thisHour = (now = new Date()) => `${now.toISOString().slice(0, 13)}:00:00Z`;
// A vote marked as fixed counts as "works": the problem it reported was solved, whatever it said.
/** How many lines of reports (model, answer, version of GamePort) the summary gives for one game. */
const REPORT_LINES = 24;

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
    [3, [...values, issues, checked.model ?? null, checked.codename ?? null, checked.report ?? null]],
    [2, [...values, issues, checked.model ?? null, checked.codename ?? null]],
    // A database that has not had the migration of the model yet, or that of the issues: the vote is saved without what it cannot hold, which is better than no vote.
    [1, [...values, issues]],
    [0, values],
  ];
  let saved = await recordVote(env, table, values, issues, checked);
  for (const [level, args] of saved ? [] : attempts) {
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
  if (checked.discord !== undefined) await saveContact(env, table, voter, checked.discord);
  // Each set tells its own channel: the real votes the real one, the test set the one for tries.
  if (table === "votes" || table === "votes_test") notifyVote(env, ctx, new URL(request.url).origin, checked, table === "votes" ? "prod" : "test", voter);
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
  const whole = bytes.length <= CHUNK_BYTES;
  try {
    await env.DB.prepare(`INSERT INTO ${table} (app_id, voter, app, device, size, data, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (app_id, voter) DO UPDATE SET app = excluded.app, device = excluded.device, size = excluded.size, data = excluded.data, updated = excluded.updated, handled = NULL`)
      .bind(meta.appId, voter, meta.app, meta.device, bytes.length, whole ? toBase64(bytes) : "", today).run();
    const [saved] = (await env.DB.prepare(`SELECT id FROM ${table} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).all()).results;
    if (!whole) {
      // The parts of the report this one replaces go first; a large report needs the table of parts, a small one does not (a database that has not had the migration yet still takes it).
      await env.DB.prepare(`DELETE FROM ${PARTS[table]} WHERE report_id = ?`).bind(saved.id).run();
      for (let seq = 0, at = 0; at < bytes.length; seq++, at += CHUNK_BYTES) {
        await env.DB.prepare(`INSERT INTO ${PARTS[table]} (report_id, seq, data) VALUES (?, ?, ?)`).bind(saved.id, seq, toBase64(bytes.subarray(at, at + CHUNK_BYTES))).run();
      }
    } else {
      try {
        await env.DB.prepare(`DELETE FROM ${PARTS[table]} WHERE report_id = ?`).bind(saved.id).run();
      } catch {
        // No table of parts yet: there is nothing to forget.
      }
    }
    await env.DB.prepare(`DELETE FROM ${table} WHERE updated < ?`).bind(oldest).run();
    try {
      await env.DB.prepare(`DELETE FROM ${PARTS[table]} WHERE report_id NOT IN (SELECT id FROM ${table})`).run();
    } catch {
      // Same: no table of parts yet.
    }
  } catch {
    // A report cut short must not stay: it would be listed and could not be read.
    try {
      await env.DB.prepare(`DELETE FROM ${table} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).run();
      await env.DB.prepare(`DELETE FROM ${PARTS[table]} WHERE report_id NOT IN (SELECT id FROM ${table})`).run();
    } catch {
      // Nothing more can be done here.
    }
    return reply(500, { error: "not saved" });
  }
  if (table === "reports" || table === "reports_test") {
    const environment = table === "reports" ? "prod" : "test";
    const votes = table === "reports" ? "votes" : "votes_test";
    let answer = null;
    let id = 0;
    try {
      const [own] = (await env.DB.prepare(`SELECT verdict FROM ${votes} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).all()).results;
      // What the app says goes first: the vote of the same player that is stored may be the one before this answer.
      answer = meta.answer ?? (own ? own.verdict : null);
      const [saved] = (await env.DB.prepare(`SELECT id FROM ${table} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).all()).results;
      id = saved ? saved.id : 0;
    } catch {
      // The report is told without the player's answer, and without its link.
    }
    // The model of the player's device, from the vote they already sent: the message names the exact device. A database without it leaves the kind of device.
    let model = null;
    let codename = null;
    try {
      const [named] = (await env.DB.prepare(`SELECT model, codename FROM ${votes} WHERE app_id = ? AND voter = ?`).bind(meta.appId, voter).all()).results;
      model = named?.model ?? null;
      codename = named?.codename ?? null;
    } catch {
      // No model to tell.
    }
    notifyReport(env, ctx, new URL(request.url).origin, { id, appId: meta.appId, app: meta.app, device: meta.device, model, codename, size: bytes.length }, answer, environment, voter);
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
    const found = await readReport(env, table, id);
    if (!found) return reply(404, { error: "not found" });
    return new Response(found.bytes, { status: 200, headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="gameport-report-${found.appId}-${id}.zip"` } });
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
  // How steadily each model ran the game, for the players who sent their numbers: for each frame rate the screens asked for, how many players and the middle player's share of the
  // seconds that held it. A frame rate shows only from MIN_PERF_PLAYERS of them. Nothing to read before migration 0020.
  try {
    const perfRows = (await env.DB.prepare(`SELECT app_id AS appId, device, model, perf_seconds AS seconds, perf_held AS held, perf_target AS target FROM ${table} WHERE perf_seconds >= ? AND model IS NOT NULL AND model <> ''`).bind(MIN_PERF_SECONDS).all()).results;
    const byModel = new Map();
    for (const row of perfRows) {
      const key = [row.appId, row.device, row.model].join("\u0000");
      byModel.set(key, [...(byModel.get(key) ?? []), row]);
    }
    for (const list of byModel.values()) {
      const model = byGame.get(list[0].appId)?.devices[list[0].device]?.models?.[list[0].model];
      const figures = performanceByTarget(list);
      if (model && figures.length) model.perf = figures;
    }
  } catch {
    // No performance columns yet.
  }
  // The problems ticked for each model, next to its counts.
  for (const row of issueRows) {
    const model = row.model ? byGame.get(row.appId)?.devices[row.device]?.models?.[row.model] : null;
    if (!model) continue;
    for (const code of String(row.issues).split(",")) {
      if (ISSUE_SET.has(code)) model.issues = { ...model.issues, [code]: (model.issues?.[code] ?? 0) + 1 };
    }
  }
  // From which version a game works after it did not, which version still works and from which it broke, for each kind of device: read in the history of the answers (nothing
  // before migration 0019). Only versions, nothing about any player.
  try {
    const found = await readTurns(env, table, null);
    for (const [appId, turns] of found) {
      const game = byGame.get(appId);
      if (!game) continue;
      for (const [device, turn] of Object.entries(turns)) if (game.devices[device]) game.devices[device].turn = turn;
    }
  } catch {
    // No history yet.
  }
  // The day a problem was solved, and in which version when it is known: shown on the site, and counted as "works" above.
  for (const fix of fixes) {
    const game = byGame.get(fix.appId);
    if (!game) continue;
    (game.fixes ??= []).push(fix.version ? { device: fix.device, day: fix.day, version: fix.version } : { device: fix.device, day: fix.day });
  }
  return reply(200, { v: 1, games: [...byGame.values()] }, { "cache-control": "public, max-age=300" });
}

/** The turns (see turns.js) of one game, or of every game when [appId] is null, from the history of the answers of the set. */
export async function readTurns(env, table, appId) {
  const history = HISTORY[table];
  const only = appId === null ? "" : " AND h.app_id = ?";
  const bind = (statement) => (appId === null ? statement : statement.bind(appId));
  const lines = (await bind(env.DB.prepare(
    `SELECT h.app_id AS appId, h.voter, h.device, h.verdict, h.app FROM ${history} h WHERE EXISTS (SELECT 1 FROM ${history} o WHERE o.app_id = h.app_id AND o.voter = h.voter AND o.id <> h.id)${only} ORDER BY h.app_id, h.voter, h.id`,
  )).all()).results;
  const last = (await bind(env.DB.prepare(
    `SELECT h.app_id AS appId, h.voter, h.device, CASE WHEN h.fixed IS NULL THEN h.verdict ELSE 'works' END AS verdict, h.app FROM ${table} h WHERE 1 = 1${only}`,
  )).all()).results;
  return turnsOf(lines, last);
}

/**
 * What the details of one game list: one line for each model, answer and version of GamePort, with how many players said it (a fixed vote counts as "works"), what the players of
 * a line ticked as going wrong, and, for a line that does not work, the version from which it may be solved (the turn of its kind of device). The newest version first, then the most
 * said, and a game keeps at most REPORT_LINES of them. A vote added by hand in the console has no version. Without the model column (before migration 0013) the model is left out
 * and the lines are only by kind of device. Asked for one game only when its details are opened, so the summary every app reads stays small. Nothing about any player.
 */
async function gameReports(env, table, appId) {
  let rows;
  try {
    rows = (await env.DB.prepare(`SELECT device, COALESCE(model, '') AS model, app AS version, CASE WHEN fixed IS NULL THEN verdict ELSE 'works' END AS verdict, CASE WHEN fixed IS NULL THEN issues END AS issues FROM ${table} WHERE app_id = ?`).bind(appId).all()).results;
  } catch {
    try {
      rows = (await env.DB.prepare(`SELECT device, '' AS model, app AS version, CASE WHEN fixed IS NULL THEN verdict ELSE 'works' END AS verdict, CASE WHEN fixed IS NULL THEN issues END AS issues FROM ${table} WHERE app_id = ?`).bind(appId).all()).results;
    } catch {
      try {
        rows = (await env.DB.prepare(`SELECT device, '' AS model, app AS version, CASE WHEN fixed IS NULL THEN verdict ELSE 'works' END AS verdict, NULL AS issues FROM ${table} WHERE app_id = ?`).bind(appId).all()).results;
      } catch {
        return reply(500, { error: "not read" });
      }
    }
  }
  let turns = {};
  try {
    turns = (await readTurns(env, table, appId)).get(appId) ?? {};
  } catch {
    // No history yet.
  }
  const grouped = new Map();
  for (const row of rows) {
    const key = [row.device, row.model, row.version, row.verdict].join("\u0000");
    const line = grouped.get(key) ?? { device: row.device, model: row.model, version: row.version, verdict: row.verdict, n: 0, issues: {} };
    line.n += 1;
    for (const code of String(row.issues ?? "").split(",")) if (ISSUE_SET.has(code)) line.issues[code] = (line.issues[code] ?? 0) + 1;
    grouped.set(key, line);
  }
  // How steadily each line ran the game, for the players who sent their numbers (nothing before migration 0020): a line shows a figure only from MIN_PERF_PLAYERS of them.
  try {
    const perfRows = (await env.DB.prepare(`SELECT device, COALESCE(model, '') AS model, app AS version, CASE WHEN fixed IS NULL THEN verdict ELSE 'works' END AS verdict, perf_seconds AS seconds, perf_held AS held, perf_target AS target FROM ${table} WHERE app_id = ? AND perf_seconds >= ?`).bind(appId, MIN_PERF_SECONDS).all()).results;
    const byLine = new Map();
    for (const row of perfRows) {
      const key = [row.device, row.model, row.version, row.verdict].join("\u0000");
      byLine.set(key, [...(byLine.get(key) ?? []), row]);
    }
    for (const [key, list] of byLine) {
      const figures = performanceByTarget(list);
      if (figures.length && grouped.has(key)) grouped.get(key).perf = figures;
    }
  } catch {
    // No performance columns yet.
  }
  const reports = [...grouped.values()]
    // The newest version first (a line without a version, or with one that is not one, last), then the most said.
    .sort((a, b) => Number(Boolean(parseVersion(b.version))) - Number(Boolean(parseVersion(a.version))) || (compareVersions(b.version, a.version) ?? 0) || b.n - a.n || a.device.localeCompare(b.device) || a.model.localeCompare(b.model))
    .slice(0, REPORT_LINES)
    .map((line) => {
      const name = line.model ? deviceLabel(line.model, null) : null;
      const since = fixedSince(line, turns);
      return {
        device: line.device,
        ...(line.model ? { model: line.model } : {}),
        ...(name ? { name } : {}),
        verdict: line.verdict,
        ...(line.version && line.version !== "admin" ? { version: line.version } : {}),
        n: line.n,
        ...(Object.keys(line.issues).length ? { issues: line.issues } : {}),
        ...(since ? { fixedSince: since } : {}),
        ...(line.perf ? { perf: line.perf } : {}),
      };
    });
  return reply(200, { v: 1, appId, reports, ...(Object.keys(turns).length ? { turns } : {}) }, { "cache-control": "public, max-age=300" });
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

/** What the developer told the app about each game: `{ "804530": { "passthrough": "on" } }`. Nothing about any player; a setting this version does not know is left out. */
async function gameDefaults(env, table) {
  let rows;
  try {
    rows = (await env.DB.prepare(`SELECT app_id AS appId, setting, value FROM ${table} ORDER BY app_id, setting`).all()).results;
  } catch {
    return reply(500, { error: "not read" });
  }
  const games = {};
  for (const row of rows) {
    if (!GAME_SETTINGS[row.setting]?.has(row.value)) continue;
    (games[row.appId] ??= {})[row.setting] = row.value;
  }
  return reply(200, { v: 1, games }, { "cache-control": "public, max-age=300" });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    // The developer's console answers its own routes (see console.js); to everyone else they do not exist.
    const consoleAnswer = await handleConsole(request, env, ctx);
    if (consoleAnswer) return consoleAnswer;
    // The reports of one game, for its details: /reports/<appId> (the real votes) or /test/reports/<appId> (the test ones).
    const reportsRoute = Object.keys(GAME_REPORTS).find((base) => path.startsWith(`${base}/`));
    if (reportsRoute) {
      const appId = path.slice(reportsRoute.length + 1);
      if (!/^\d{1,9}$/.test(appId)) return reply(404, { error: "not found" });
      if (!env.DB) return reply(500, { error: "relay not configured" });
      return request.method === "GET" ? gameReports(env, GAME_REPORTS[reportsRoute], Number(appId)) : reply(405, { error: "use GET" });
    }
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
    if (route.defaults) return request.method === "GET" ? gameDefaults(env, route.table) : reply(405, { error: "use GET" });
    if (route.list) return request.method === "GET" ? incompatibleList(env, route.table, route.reasons) : reply(405, { error: "use GET" });
    if (route.report) return request.method === "POST" ? report(request, env, route.table, ctx) : reply(405, { error: "use POST" });
    if (!route.write) return request.method === "GET" ? summary(env, route.table) : reply(405, { error: "use GET" });
    return request.method === "POST" ? vote(request, env, route.table, ctx) : reply(405, { error: "use POST" });
  },
};
