import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareVersions, fixedSince, parseVersion, turnsOf } from "./turns.js";

const line = (voter, verdict, app, device = "quest", appId = 1) => ({ appId, voter, device, verdict, app });

describe("the versions of GamePort", () => {
  it("are compared as numbers, a test build before its release", () => {
    assert.ok(compareVersions("0.9.10", "0.9.9") > 0);
    assert.ok(compareVersions("0.8.2", "0.9.0") < 0);
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
    assert.ok(compareVersions("0.9.2-alpha.3", "0.9.2") < 0);
    assert.ok(compareVersions("0.9.2-alpha.3", "0.9.2-alpha.10") < 0);
  });

  it("are null when it is not a version, so an answer added by hand is left out", () => {
    assert.equal(parseVersion("admin"), null);
    assert.equal(compareVersions("admin", "0.9.0"), null);
    assert.equal(parseVersion(undefined), null);
  });
});

describe("the turns of a game", () => {
  it("tells from which version it works after it did not, and which version still works", () => {
    const history = [line("a", "fails", "0.8.2"), line("a", "works", "0.9.0"), line("a", "works", "0.9.3")];
    const latest = [line("a", "works", "0.9.3"), line("b", "works", "0.9.1")];
    assert.deepEqual(turnsOf(history, latest).get(1), { quest: { fixedIn: "0.9.0", failedIn: "0.8.2", stillIn: "0.9.3" } });
  });

  it("takes the oldest version of the players that went from not working to working", () => {
    const history = [line("a", "fails", "0.8.2"), line("a", "works", "0.9.3"), line("b", "fails", "0.8.2"), line("b", "works", "0.9.0")];
    assert.equal(turnsOf(history).get(1).quest.fixedIn, "0.9.0");
  });

  it("has no turn for a player who says the same thing at every version, or in the same version", () => {
    assert.equal(turnsOf([line("a", "works", "0.9.0"), line("a", "works", "0.9.3")]).size, 0);
    assert.equal(turnsOf([line("a", "fails", "0.9.0"), line("a", "works", "0.9.0")]).size, 0);
    assert.equal(turnsOf([line("a", "fails", "0.9.0"), line("a", "fails", "0.9.3")]).size, 0);
  });

  it("counts offline only as not working", () => {
    assert.equal(turnsOf([line("a", "offline_only", "0.8.2"), line("a", "works", "0.9.0")]).get(1).quest.fixedIn, "0.9.0");
  });

  it("tells from which version it broke, when the player still says so", () => {
    const history = [line("a", "works", "0.9.0"), line("a", "fails", "0.9.3")];
    assert.deepEqual(turnsOf(history).get(1), { quest: { brokeIn: "0.9.3" } });
    // Not when the player said it works again since.
    assert.equal(turnsOf([line("a", "works", "0.9.0"), line("a", "fails", "0.9.3"), line("a", "works", "0.9.4")]).get(1).quest.brokeIn, undefined);
  });

  it("keeps the games and the kinds of device apart", () => {
    const history = [line("a", "fails", "0.8.2", "quest", 1), line("a", "works", "0.9.0", "quest", 1), line("b", "fails", "0.8.2", "pico", 2), line("b", "works", "0.9.5", "pico", 2)];
    const found = turnsOf(history);
    assert.equal(found.get(1).quest.fixedIn, "0.9.0");
    assert.equal(found.get(1).pico, undefined);
    assert.equal(found.get(2).pico.fixedIn, "0.9.5");
  });

  it("does not say a version still works unless it is newer than the one that fixed it", () => {
    const history = [line("a", "fails", "0.8.2"), line("a", "works", "0.9.0")];
    assert.equal(turnsOf(history, [line("a", "works", "0.9.0"), line("c", "works", "0.8.9")]).get(1).quest.stillIn, undefined);
  });

  it("leaves out the lines whose version is not one", () => {
    assert.equal(turnsOf([line("a", "fails", "admin"), line("a", "works", "0.9.0")]).size, 0);
  });
});

describe("the version from which a line may be solved", () => {
  const turns = { quest: { fixedIn: "0.9.0" } };
  it("is the version of the turn, for an older line that does not work, of the same kind of device", () => {
    assert.equal(fixedSince({ device: "quest", verdict: "fails", version: "0.8.2" }, turns), "0.9.0");
    assert.equal(fixedSince({ device: "quest", verdict: "offline_only", version: "0.8.2" }, turns), "0.9.0");
  });

  it("is null for a line that works, a newer line, another kind of device, or no turn", () => {
    assert.equal(fixedSince({ device: "quest", verdict: "works", version: "0.8.2" }, turns), null);
    assert.equal(fixedSince({ device: "quest", verdict: "fails", version: "0.9.3" }, turns), null);
    assert.equal(fixedSince({ device: "pico", verdict: "fails", version: "0.8.2" }, turns), null);
    assert.equal(fixedSince({ device: "quest", verdict: "fails", version: "0.8.2" }, undefined), null);
  });
});
