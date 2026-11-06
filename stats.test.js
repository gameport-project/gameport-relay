import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adoptionOf, dailyOf, daysEndingOn, devicesOf, evolutionOf, majorityOf, recentChanges, topGamesOf, topPlayersOf, versionsOf } from "./stats.js";
import { compareVersions } from "./turns.js";

const line = (appId, voter, verdict, updated, extra = {}) => ({ appId, voter, verdict, updated, ...extra });

describe("the numbers of the home", () => {
  it("lists the days that end on a day, oldest first", () => {
    assert.deepEqual(daysEndingOn("2026-11-02", 4), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("takes the more careful answer when two are equal", () => {
    assert.equal(majorityOf({ works: 2, offline_only: 0, fails: 2 }), "fails");
    assert.equal(majorityOf({ works: 2, offline_only: 2, fails: 0 }), "offline_only");
    assert.equal(majorityOf({ works: 3, offline_only: 1, fails: 1 }), "works");
  });

  it("follows the games from day to day, each player counting once per game with the last answer they had given", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03"];
    const found = evolutionOf([
      line(5, "a", "fails", "2026-11-01"),
      line(6, "a", "works", "2026-11-02"),
      line(5, "a", "works", "2026-11-03"), // the same player changes their mind: the game moves
    ], days);
    assert.deepEqual(found, [
      { day: "2026-11-01", works: 0, offline_only: 0, fails: 1 },
      { day: "2026-11-02", works: 1, offline_only: 0, fails: 1 },
      { day: "2026-11-03", works: 2, offline_only: 0, fails: 0 },
    ]);
    // A line marked as fixed counts as "works".
    assert.deepEqual(evolutionOf([line(5, "a", "fails", "2026-11-01", { fixed: "2026-11-02" })], ["2026-11-01"]), [{ day: "2026-11-01", works: 1, offline_only: 0, fails: 0 }]);
  });

  it("counts the answers, the new players and the reports of each day", () => {
    const days = ["2026-11-01", "2026-11-02"];
    assert.deepEqual(dailyOf([line(5, "a", "works", "2026-11-01"), line(6, "a", "works", "2026-11-02"), line(5, "b", "fails", "2026-11-02")], ["2026-11-02"], days), [
      { day: "2026-11-01", answers: 1, newPlayers: 1, reports: 0 },
      { day: "2026-11-02", answers: 2, newPlayers: 1, reports: 1 },
    ]);
  });

  it("ranks the players by the games they answered, then by their answers, with how their games split", () => {
    const latest = [
      { appId: 5, voter: "a", verdict: "works" }, { appId: 6, voter: "a", verdict: "fails" },
      { appId: 5, voter: "b", verdict: "works" }, { appId: 6, voter: "b", verdict: "offline_only", fixed: null },
      { appId: 7, voter: "c", verdict: "fails", fixed: "2026-11-02" },
    ];
    const lines = [line(5, "a", "w", "d"), line(6, "a", "w", "d"), line(5, "b", "w", "d"), line(5, "b", "w", "d"), line(6, "b", "w", "d"), line(7, "c", "w", "d")];
    assert.deepEqual(topPlayersOf(latest, lines, ["b", "b", "a"], 2), [
      { voter: "b", games: 2, works: 1, offline_only: 1, fails: 0, devices: [], answers: 3, reports: 2 },
      { voter: "a", games: 2, works: 1, offline_only: 0, fails: 1, devices: [], answers: 2, reports: 1 },
    ]);
    // The devices a player answered on, the one with the most games first.
    const withDevices = topPlayersOf([{ appId: 5, voter: "a", verdict: "works", d: "Q" }, { appId: 6, voter: "a", verdict: "works", d: "P" }, { appId: 7, voter: "a", verdict: "works", d: "P" }], [], [], 8, (row) => row.d);
    assert.deepEqual(withDevices[0].devices, ["P", "Q"]);
    // An answer from before the model was sent (only the kind, "pico") is the one named model of that kind the player gave elsewhere, and is not guessed when there are two.
    const row = (appId, voter, d, device) => ({ appId, voter, verdict: "works", d, device });
    const nameOf = (r) => r.d;
    const inferred = topPlayersOf([row(5, "a", "Pico 4", "pico"), row(6, "a", "pico", "pico"), row(7, "a", "pico", "pico")], [], [], 8, nameOf);
    assert.deepEqual(inferred[0].devices, ["Pico 4"]);
    const ambiguous = topPlayersOf([row(5, "a", "Pico 4", "pico"), row(6, "a", "Pico 4 Ultra", "pico"), row(7, "a", "pico", "pico")], [], [], 8, nameOf);
    assert.deepEqual(ambiguous[0].devices.sort(), ["Pico 4", "Pico 4 Ultra"]);
    assert.deepEqual(topPlayersOf([row(5, "a", "pico", "pico")], [], [], 8, nameOf)[0].devices, ["pico"]);
    // A line marked as fixed counts as "works".
    assert.equal(topPlayersOf(latest, lines, [])[2].works, 1);
  });

  it("ranks the games that work best and the games that fail the most", () => {
    const latest = [line(5, "a", "works"), line(5, "b", "works"), line(5, "c", "fails"), line(6, "a", "fails"), line(6, "b", "fails"), line(7, "a", "works")].map((l) => ({ ...l }));
    const found = topGamesOf(latest, 2);
    assert.deepEqual(found.working.map((g) => [g.appId, g.works, g.fails]), [[5, 2, 1], [7, 1, 0]]);
    assert.deepEqual(found.failing.map((g) => [g.appId, g.fails]), [[6, 2], [5, 1]]);
  });

  it("counts, for each device, the different games that work or do not", () => {
    const latest = [line(5, "a", "works", null, { d: "Q" }), line(5, "b", "fails", null, { d: "Q" }), line(5, "c", "fails", null, { d: "Q" }), line(6, "a", "works", null, { d: "Q" }), line(5, "z", "fails", null, { d: "P" })];
    assert.deepEqual(devicesOf(latest.map((row) => ({ ...row, device: row.d === "Q" ? "quest" : "pico" })), (row) => row.d), [{ name: "Q", kind: "quest", answers: 4, works: 1, offline_only: 0, fails: 1 }, { name: "P", kind: "pico", answers: 1, works: 0, offline_only: 0, fails: 1 }]);
  });

  it("counts the players still seen by the version of their last answer", () => {
    const lines = [line(5, "a", "works", "2026-10-01", { app: "0.9.0" }), line(5, "a", "works", "2026-11-02", { app: "0.9.4" }), line(5, "b", "works", "2026-11-02", { app: "0.9.4" }), line(5, "c", "works", "2026-09-01", { app: "0.8.0" }), line(5, "d", "works", "2026-11-01", { app: "0.9.3" })];
    assert.deepEqual(versionsOf(lines, "2026-10-03", compareVersions), [{ app: "0.9.4", players: 2 }, { app: "0.9.3", players: 1 }]);
  });

  it("keeps the changes of the period only", () => {
    const lines = [line(5, "a", "works", "2026-10-01", { app: "0.9.0" }), line(5, "a", "fails", "2026-10-02", { app: "0.9.1" }), line(6, "b", "fails", "2026-11-01", { app: "0.9.1" }), line(6, "b", "works", "2026-11-02", { app: "0.9.4" })];
    assert.deepEqual(recentChanges(lines, "2026-10-20").map((c) => [c.appId, c.kind, c.day]), [[6, "improvement", "2026-11-02"]]);
  });

  it("tells how many of the players seen lately are on a version, among those who were there before it", () => {
    const lines = [
      line(5, "a", "works", "2026-10-01", { app: "0.9.0" }), line(5, "b", "works", "2026-10-01", { app: "0.9.0" }), line(5, "c", "works", "2026-10-01", { app: "0.9.0" }),
      line(5, "d", "works", "2026-10-01", { app: "0.9.0" }),
      line(5, "a", "works", "2026-10-12", { app: "0.9.1" }), // a updates after 2 days (0.9.1 first seen 10-10 through e)
      line(5, "e", "works", "2026-10-10", { app: "0.9.1" }), // e starts on 0.9.1: not an update, and sets the day it appeared
      line(5, "b", "works", "2026-10-20", { app: "0.9.1" }), // b updates after 10 days
      line(5, "c", "works", "2026-10-02", { app: "0.9.0" }), // c was last seen on 10-02: not seen lately
      line(5, "d", "works", "2026-11-05", { app: "0.9.0" }), // d is seen lately and still on the old one
    ];
    const rows = adoptionOf(lines, compareVersions, "2026-10-15");
    const newest = rows[0];
    assert.deepEqual([newest.app, newest.firstSeen], ["0.9.1", "2026-10-10"]);
    // Seen since 10-15: a (last 10-12? no: before), b (10-20), d (11-05). a's last line is 10-12, so only b and d count, both there before 0.9.1.
    assert.deepEqual([newest.eligible, newest.moved], [2, 1]);
    assert.equal(newest.medianDays, 10);
    const oldest = rows[1];
    assert.deepEqual([oldest.app, oldest.eligible, oldest.moved], ["0.9.0", 0, 0]);
    assert.equal(oldest.medianDays, null);
    assert.deepEqual(adoptionOf([line(5, "a", "works", "2026-10-01", { app: "admin" })], compareVersions, "2026-09-01"), []);
  });
});
