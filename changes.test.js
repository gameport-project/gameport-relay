import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { changesOf } from "./changes.js";

const line = (appId, voter, verdict, app, game = null) => ({ appId, voter, verdict, app, game });

describe("the changes of the players between two versions", () => {
  it("tells a regression and an improvement, for the same player and game", () => {
    const found = changesOf([
      line(5, "a", "works", "0.9.0"), line(5, "a", "fails", "0.9.1"),
      line(6, "b", "fails", "0.9.0"), line(6, "b", "works", "0.9.1"),
      line(6, "c", "offline_only", "0.9.0"), line(6, "c", "works", "0.9.1"),
    ]);
    assert.deepEqual(found.map((c) => [c.appId, c.from, c.to, c.kind]), [[5, "0.9.0", "0.9.1", "regression"], [6, "0.9.0", "0.9.1", "improvement"], [6, "0.9.0", "0.9.1", "improvement"]]);
  });

  it("leaves out an answer that did not change, a change on the same version, and a version that goes down", () => {
    assert.deepEqual(changesOf([line(5, "a", "works", "0.9.0"), line(5, "a", "works", "0.9.1")]), []);
    assert.deepEqual(changesOf([line(5, "a", "works", "0.9.1"), line(5, "a", "fails", "0.9.1")]), []);
    assert.deepEqual(changesOf([line(5, "a", "works", "0.9.1"), line(5, "a", "fails", "0.9.0")]), []);
  });

  it("does not mix players or games, and compares versions as numbers", () => {
    assert.deepEqual(changesOf([line(5, "a", "works", "0.9.9"), line(5, "b", "fails", "0.9.10"), line(6, "a", "fails", "0.9.10")]), []);
    assert.equal(changesOf([line(5, "a", "works", "0.9.9"), line(5, "a", "fails", "0.9.10")]).length, 1);
    // A test build comes before its release.
    assert.equal(changesOf([line(5, "a", "fails", "0.9.2-alpha.3"), line(5, "a", "works", "0.9.2")])[0].kind, "improvement");
  });

  it("leaves out a line whose version is not one, such as an answer added by hand", () => {
    assert.deepEqual(changesOf([line(5, "a", "works", "admin"), line(5, "a", "fails", "0.9.1")]), []);
  });

  it("says whether the game was the same build, another one, or unknown", () => {
    const game = (before, after) => changesOf([line(5, "a", "works", "0.9.0", before), line(5, "a", "fails", "0.9.1", after)])[0].game;
    assert.equal(game("1.2.3", "1.2.3"), "same");
    assert.equal(game("1.2.3", "1.2.4"), "changed");
    assert.equal(game(null, "1.2.4"), "unknown");
    assert.equal(game(null, null), "unknown");
  });
});
