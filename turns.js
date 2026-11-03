// What the history of the answers says about a game: from which version of GamePort it was seen working after it did not, which version still works, and from which it
// broke. Pure functions on the lines of the history, so the rules are tried without a database. Nothing about any player leaves here: only versions.

const VERSION = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:-alpha\.(\d{1,5}))?$/;

/** A version of GamePort as numbers, or null when it is not one (an answer added by hand in the console may say anything). A test build (0.9.2-alpha.3) comes before its release. */
export function parseVersion(text) {
  const found = VERSION.exec(String(text ?? ""));
  return found ? [Number(found[1]), Number(found[2]), Number(found[3]), found[4] === undefined ? Infinity : Number(found[4])] : null;
}

/** Negative when [a] is older than [b], positive when newer, zero when the same; null when one of them is not a version. 0.9.10 is newer than 0.9.9. */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return null;
  for (let i = 0; i < 4; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

const older = (a, b) => compareVersions(a, b) < 0;
const newer = (a, b) => compareVersions(a, b) > 0;
const works = (line) => line.verdict === "works";

/**
 * The turns of the games, for each kind of device.
 *
 * [history] are the lines of the players who answered a game more than once, oldest first (appId, voter, device, verdict, app). [latest] are the last answer of every player
 * (the same fields). The result is a Map of appId to an object of kind of device to its turn:
 *  - `fixedIn`: the oldest version where a player said "it works" after saying it did not on an older one (with `failedIn`, the older one);
 *  - `stillIn`: the newest version where some player says "it works", when it is newer than `fixedIn`;
 *  - `brokeIn`: the oldest version where a player said it did not work after saying it worked on an older one, and has not said otherwise since.
 * A kind of device that has none of these has no entry. A line whose version is not a version is left out.
 */
export function turnsOf(history, latest = []) {
  const found = new Map();
  const turn = (appId, device) => {
    const game = found.get(appId) ?? {};
    found.set(appId, game);
    return (game[device] ??= {});
  };
  const players = new Map();
  for (const line of history) {
    if (!parseVersion(line.app)) continue;
    const key = `${line.appId}\u0000${line.voter}`;
    if (!players.has(key)) players.set(key, []);
    players.get(key).push(line);
  }
  for (const lines of players.values()) {
    // The first time the player says it works on a newer version than one where it did not.
    for (let i = 1; i < lines.length; i++) {
      if (!works(lines[i])) continue;
      const before = lines.slice(0, i).filter((line) => !works(line) && older(line.app, lines[i].app)).at(-1);
      if (!before) continue;
      const mine = turn(lines[i].appId, lines[i].device);
      if (mine.fixedIn === undefined || older(lines[i].app, mine.fixedIn)) {
        mine.fixedIn = lines[i].app;
        mine.failedIn = before.app;
      }
      break;
    }
    // The first time it does not work on a newer version than one where it did, if that is still what the player says.
    const last = lines.at(-1);
    if (!works(last)) {
      for (let i = 1; i < lines.length; i++) {
        if (works(lines[i])) continue;
        if (!lines.slice(0, i).some((line) => works(line) && older(line.app, lines[i].app))) continue;
        const mine = turn(lines[i].appId, lines[i].device);
        if (mine.brokeIn === undefined || older(lines[i].app, mine.brokeIn)) mine.brokeIn = lines[i].app;
        break;
      }
    }
  }
  // The newest version that still works, from what every player says last.
  for (const line of latest) {
    if (!works(line) || !parseVersion(line.app)) continue;
    const game = found.get(line.appId);
    const mine = game?.[line.device];
    if (mine?.fixedIn !== undefined && newer(line.app, mine.fixedIn) && (mine.stillIn === undefined || newer(line.app, mine.stillIn))) mine.stillIn = line.app;
  }
  return found;
}

/** The version from which a line that says it does not work may be solved: the version of the turn of its kind of device, when the line is older than it. */
export function fixedSince(line, turns) {
  const fixedIn = turns?.[line.device]?.fixedIn;
  return fixedIn !== undefined && line.verdict !== "works" && older(line.version ?? line.app, fixedIn) ? fixedIn : null;
}
