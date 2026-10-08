// The relay between GamePort and the compatibility file: it takes the verdict a player gave about a game ("it worked" / "it did not"),
// keeps one vote per player and per game in a small database, and publishes the totals. It stores no name, no address, no log of who sent what.
// See README.md.

// "offline_only": the game works, but only without the network (its online or multiplayer part does not).
const VERDICTS = new Set(["works", "offline_only", "fails"]);
const DEVICES = new Set(["quest", "pico", "phone", "tablet", "other"]);
const MAX_BODY_BYTES = 1024;
const MAX_APP_ID = 2_000_000_000;

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
  const vote = { appId: message.appId, verdict: message.verdict, app: message.app, device: message.device, voter: message.voter };
  if (message.game !== undefined) vote.game = message.game;
  // "Worked offline" only means something for a game that worked: a vote that says it did not work never carries it.
  vote.offline = message.offline === true && message.verdict === "works";
  return { vote };
}

/** The voter is stored as a short hash, so the id the app keeps is never in the database. */
export async function voterHash(voter, salt) {
  const bytes = new TextEncoder().encode(`${salt ?? ""}${voter}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

// The routes and the table each one reads and writes. The names of the tables come from here and from nowhere else, never from a message.
const ROUTES = {
  "/vote": { table: "votes", write: true },
  "/summary": { table: "votes", write: false },
  "/test/vote": { table: "votes_test", write: true },
  "/test/summary": { table: "votes_test", write: false },
};

const upsert = (table) => `INSERT INTO ${table} (app_id, voter, verdict, app, game, device, offline, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (app_id, voter) DO UPDATE SET verdict = excluded.verdict, app = excluded.app, game = excluded.game, device = excluded.device, offline = excluded.offline, updated = excluded.updated`;
const summaryQuery = (table) => `SELECT app_id AS appId, device, SUM(verdict = 'works') AS works, SUM(verdict = 'offline_only') AS offlineOnly, SUM(verdict = 'fails') AS fails, SUM(verdict = 'works' AND offline = 1) AS worksOffline FROM ${table} GROUP BY app_id, device ORDER BY app_id, device`;

function reply(status, body, headers = {}) {
  const json = body !== undefined && typeof body === "object";
  return new Response(json ? JSON.stringify(body) : null, { status, headers: json ? { "content-type": "application/json", ...headers } : headers });
}

async function vote(request, env, table) {
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
  try {
    await env.DB.prepare(upsert(table)).bind(checked.appId, voter, checked.verdict, checked.app, checked.game ?? null, checked.device, checked.offline ? 1 : 0, today).run();
  } catch {
    // What the database said stays here: the player only learns that it did not work.
    return reply(500, { error: "not saved" });
  }
  return reply(204);
}

/** The totals per game, nothing about any player. The compatibility file is built from this. */
async function summary(env, table) {
  let rows;
  try {
    rows = (await env.DB.prepare(summaryQuery(table)).all()).results;
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
  return reply(200, { v: 1, games: [...byGame.values()] }, { "cache-control": "public, max-age=300" });
}

export default {
  async fetch(request, env) {
    const route = ROUTES[new URL(request.url).pathname];
    if (!route) return reply(404, { error: "not found" });
    if (!env.DB) return reply(500, { error: "relay not configured" });
    if (!route.write) return request.method === "GET" ? summary(env, route.table) : reply(405, { error: "use GET" });
    return request.method === "POST" ? vote(request, env, route.table) : reply(405, { error: "use POST" });
  },
};
