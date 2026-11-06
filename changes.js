// What the history of the answers says about the move of one player from a version of GamePort to a newer one: the answer got worse (a regression) or better (an improvement) for
// the same game. Pure functions on the lines of the history, so the rules are tried without a database. Nothing about any player leaves here: no id, only the game and the versions.
import { compareVersions } from "./turns.js";

// From the worst answer to the best: a player who goes up the scale improved, one who goes down regressed.
const RANK = { fails: 0, offline_only: 1, works: 2 };

/**
 * The changes of the players between two versions of GamePort. [history] are the lines (appId, voter, verdict, app, game), oldest first. For every player and game, two lines
 * in a row whose version of GamePort goes up and whose answer changes make one change: `{ appId, from, to, was, now, kind, game, day }` (`day` is the day of the second line, when the lines say it), where `kind` is "regression" or "improvement" and
 * `game` says whether the build of the game was the same on both lines ("same"), was not ("changed", so the game may be the cause, not GamePort) or is not known for one of them ("unknown").
 * A line whose version is not a version (an answer added by hand) is left out, and so is a change of answer on the same version of GamePort.
 */
export function changesOf(history) {
  const players = new Map();
  for (const line of history) {
    const key = `${line.appId}\u0000${line.voter}`;
    if (!players.has(key)) players.set(key, []);
    players.get(key).push(line);
  }
  const found = [];
  for (const lines of players.values()) {
    for (let i = 1; i < lines.length; i++) {
      const before = lines[i - 1];
      const after = lines[i];
      const order = compareVersions(before.app, after.app);
      if (order === null || order >= 0) continue;
      const was = RANK[before.verdict];
      const now = RANK[after.verdict];
      if (was === undefined || now === undefined || was === now) continue;
      const game = before.game && after.game ? (before.game === after.game ? "same" : "changed") : "unknown";
      found.push({ appId: before.appId, from: before.app, to: after.app, was: before.verdict, now: after.verdict, kind: now > was ? "improvement" : "regression", game, ...(after.updated ? { day: after.updated } : {}) });
    }
  }
  return found;
}
