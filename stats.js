// The numbers of the console's home: pure functions on the lines of the history and on the last answers, so the rules are tried without a database. Days are written YYYY-MM-DD (UTC),
// the way the relay stores them. Nothing here reads a name: a player is only a hash.
import { changesOf } from "./changes.js";

/** The answer most answers of a game give, the more careful one when two are equal: the same rule as the console's badge of a game. */
export function majorityOf(c) {
  if (c.fails >= c.works && c.fails >= c.offline_only) return "fails";
  if (c.offline_only >= c.works) return "offline_only";
  return "works";
}

/** The [count] days that end on [today], oldest first. */
export function daysEndingOn(today, count) {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

const classOf = (line) => (line.fixed ? "works" : line.verdict);

/**
 * How many games work, work offline only or do not work, at the end of each of [days]: every player counts once per game with the last answer they had given by then, and a
 * game counts as what most of its answers say. [lines] are the lines of the history (appId, voter, verdict, updated, fixed), oldest first. A game nobody had answered yet is not counted.
 */
export function evolutionOf(lines, days) {
  const ordered = [...lines].sort((a, b) => (a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : 0));
  const last = new Map();
  const games = new Map();
  let next = 0;
  return days.map((day) => {
    while (next < ordered.length && ordered[next].updated <= day) {
      const line = ordered[next++];
      const key = `${line.appId}\u0000${line.voter}`;
      const game = games.get(line.appId) ?? { works: 0, offline_only: 0, fails: 0 };
      games.set(line.appId, game);
      const before = last.get(key);
      if (before) game[before]--;
      const now = classOf(line);
      if (game[now] === undefined) continue;
      last.set(key, now);
      game[now]++;
    }
    const total = { day, works: 0, offline_only: 0, fails: 0 };
    for (const game of games.values()) if (game.works + game.offline_only + game.fails > 0) total[majorityOf(game)]++;
    return total;
  });
}

/** Per day: the answers given, the players seen for the first time, and the reports received. [reports] are the days the reports came. */
export function dailyOf(lines, reports, days) {
  const answers = new Map();
  const first = new Map();
  for (const line of lines) {
    answers.set(line.updated, (answers.get(line.updated) ?? 0) + 1);
    if (!first.has(line.voter) || line.updated < first.get(line.voter)) first.set(line.voter, line.updated);
  }
  const fresh = new Map();
  for (const day of first.values()) fresh.set(day, (fresh.get(day) ?? 0) + 1);
  const received = new Map();
  for (const day of reports) received.set(day, (received.get(day) ?? 0) + 1);
  return days.map((day) => ({ day, answers: answers.get(day) ?? 0, newPlayers: fresh.get(day) ?? 0, reports: received.get(day) ?? 0 }));
}

/**
 * The players who answered the most different games, with how many answers and reports each, and how their games split: at most [n], the one with more answers first when games are
 * equal. [latest] are the last answers (appId, voter, verdict, fixed): each is one game of the player.
 */
export function topPlayersOf(latest, lines, reportVoters, n = 8, nameOf = () => null) {
  // An answer given when the app did not yet say the model only knows the kind of device ("pico"): when the same player gave a named model of that kind on another game, and only one,
  // it is that device. With several named models of the kind the answer is left out rather than guessed.
  const named = new Map();
  for (const row of latest) {
    const name = nameOf(row);
    if (!name || name === row.device) continue;
    const kinds = named.get(row.voter) ?? new Map();
    named.set(row.voter, kinds);
    kinds.set(row.device, (kinds.get(row.device) ?? new Set()).add(name));
  }
  const split = new Map();
  const used = new Map();
  for (const row of latest) {
    const mine = split.get(row.voter) ?? { works: 0, offline_only: 0, fails: 0 };
    split.set(row.voter, mine);
    let name = nameOf(row);
    if (name && name === row.device) {
      const options = named.get(row.voter)?.get(row.device);
      if (options?.size === 1) name = [...options][0];
      else if (options && options.size > 1) name = null;
    }
    if (name) {
      const own = used.get(row.voter) ?? new Map();
      used.set(row.voter, own);
      own.set(name, (own.get(name) ?? 0) + 1);
    }
    const kind = classOf(row);
    if (mine[kind] !== undefined) mine[kind]++;
  }
  const answers = new Map();
  for (const line of lines) answers.set(line.voter, (answers.get(line.voter) ?? 0) + 1);
  const reports = new Map();
  for (const voter of reportVoters) reports.set(voter, (reports.get(voter) ?? 0) + 1);
  return [...split].map(([voter, mine]) => ({ voter, games: mine.works + mine.offline_only + mine.fails, ...mine, devices: [...(used.get(voter) ?? [])].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([name]) => name), answers: answers.get(voter) ?? 0, reports: reports.get(voter) ?? 0 }))
    .sort((a, b) => b.games - a.games || b.answers - a.answers || (a.voter < b.voter ? -1 : 1)).slice(0, n);
}

/**
 * The games that work best (the most "it works" answers) and the games that fail the most (the most "does not work"; only those that have one): at most [n] each. [latest] are the
 * last answers (appId, verdict, fixed). Each game comes with its counts of answers that work, work offline only and do not work.
 */
export function topGamesOf(latest, n = 8) {
  const per = new Map();
  for (const row of latest) {
    const game = per.get(row.appId) ?? { appId: row.appId, answers: 0, works: 0, offline_only: 0, fails: 0 };
    per.set(row.appId, game);
    game.answers++;
    const kind = classOf(row);
    if (game[kind] !== undefined) game[kind]++;
  }
  const all = [...per.values()];
  return {
    working: all.filter((g) => g.works > 0).sort((a, b) => b.works - a.works || a.fails - b.fails || a.appId - b.appId).slice(0, n),
    failing: all.filter((g) => g.fails > 0).sort((a, b) => b.fails - a.fails || a.works - b.works || a.appId - b.appId).slice(0, n),
  };
}

/** Per device (by [nameOf], which turns a row into the name the console shows): its kind, the number of different games that work, work offline only or do not work, and the answers. Biggest first. */
export function devicesOf(latest, nameOf) {
  const per = new Map();
  for (const row of latest) {
    const name = nameOf(row);
    const device = per.get(name) ?? { name, answers: 0, games: new Map(), kinds: new Map() };
    per.set(name, device);
    device.answers++;
    device.kinds.set(row.device, (device.kinds.get(row.device) ?? 0) + 1);
    const game = device.games.get(row.appId) ?? { works: 0, offline_only: 0, fails: 0 };
    device.games.set(row.appId, game);
    game[classOf(row)]++;
  }
  return [...per.values()].map((device) => {
    const count = { works: 0, offline_only: 0, fails: 0 };
    for (const game of device.games.values()) count[majorityOf(game)]++;
    // The kind of device ("quest", "pico"...) the answers of this name mostly come from: what the console groups the devices by.
    const kind = [...device.kinds].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null;
    return { name: device.name, kind, answers: device.answers, ...count };
  }).sort((a, b) => b.answers - a.answers || (a.name < b.name ? -1 : 1));
}

/** The players still seen in the last [days] (their last answer is not older than [since]), counted by the version of GamePort of that last answer. Newest version first. */
export function versionsOf(lines, since, byVersion) {
  const lastOf = new Map();
  for (const line of lines) lastOf.set(line.voter, line);
  const per = new Map();
  for (const line of lastOf.values()) if (line.updated >= since) per.set(line.app, (per.get(line.app) ?? 0) + 1);
  return [...per].map(([app, players]) => ({ app, players })).sort((a, b) => byVersion(b.app, a.app));
}

/** The changes between versions made on or after [since]: the line a player moved on is the day of the change. */
export function recentChanges(lines, since) {
  return changesOf(lines).filter((change) => change.day >= since);
}

/**
 * How many of the players seen lately are on a new version of GamePort. For each version, [lines] (voter, app, updated as the day of each line, oldest first) give the day it was first seen,
 * and the players taken into account are those answered since [since] (a player not seen in the window is not counted: they may have stopped using GamePort) and who were already
 * there before that version appeared (a player who started on it did not update). Of them, `moved` is how many have their last answer on that version or a newer one, and `medianDays` the
 * usual wait between the version appearing and their first answer on it or a newer one. The versions are listed newest first.
 */
export function adoptionOf(lines, byVersion, since) {
  const players = new Map();
  const firstSeen = new Map();
  for (const line of lines) {
    const own = players.get(line.voter) ?? [];
    players.set(line.voter, own);
    own.push(line);
    const seen = firstSeen.get(line.app);
    if (seen === undefined || line.updated < seen) firstSeen.set(line.app, line.updated);
  }
  const days = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  const atLeast = (app, version) => {
    const order = byVersion(app, version);
    return order !== null && order >= 0;
  };
  const active = [];
  for (const own of players.values()) {
    let latest = own[0];
    let first = own[0].updated;
    for (const line of own) {
      if (line.updated >= latest.updated) latest = line;
      if (line.updated < first) first = line.updated;
    }
    if (latest.updated >= since) active.push({ lines: own, latest, first });
  }
  return [...firstSeen].filter(([app]) => byVersion(app, app) === 0).map(([app, day]) => {
    const eligible = active.filter((player) => player.first < day);
    const moved = eligible.filter((player) => atLeast(player.latest.app, app));
    const waits = moved.map((player) => days(day, player.lines.filter((line) => atLeast(line.app, app)).map((line) => line.updated).sort()[0])).sort((x, y) => x - y);
    return { app, firstSeen: day, eligible: eligible.length, moved: moved.length, medianDays: waits.length ? waits[Math.floor(waits.length / 2)] : null };
  }).sort((x, y) => byVersion(y.app, x.app));
}
