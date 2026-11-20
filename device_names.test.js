import assert from "node:assert/strict";
import { test } from "node:test";
import { codesOf, deviceLabel, unknownHeadsetName } from "./device_names.js";

test("the Pico 4 is known by each of its model codes", () => {
  for (const code of ["A8110", "A81E0", "A8150", "A8170"]) assert.equal(deviceLabel(code, null), "Pico 4");
});

test("the Pico 4 Ultra is known by each of its model codes", () => {
  for (const code of ["A92Y0", "A921C"]) assert.equal(deviceLabel(code, null), "Pico 4 Ultra");
});

test("a headset whose model is not listed is named by its kind and its code", () => {
  assert.equal(deviceLabel("ZZ999", null), null);
  assert.equal(unknownHeadsetName("pico", "ZZ999"), "Pico ZZ999");
  assert.equal(unknownHeadsetName("quest", "XYZ1"), "Quest XYZ1");
});

test("nothing is made up for a device that is not a headset or has no code", () => {
  assert.equal(unknownHeadsetName("phone", "SM-G991B"), null);
  assert.equal(unknownHeadsetName("pico", ""), null);
  assert.equal(unknownHeadsetName("pico", null), null);
});

test("the codes of a named device are the model codes and the codenames that carry its name", () => {
  const codes = codesOf(["Pico 4"]);
  for (const code of ["A8110", "A81E0", "A8150", "A8170", "PICOA8110"]) assert.ok(codes.includes(code), code);
  assert.ok(!codes.includes("A92Y0"));
  // "Meta" is not part of what a person says.
  assert.ok(codesOf(["Quest 3"]).includes("eureka"));
  assert.deepEqual(codesOf(["No such device"]), []);
  // A kind of device is not a device: it gives no code.
  assert.deepEqual(codesOf(["quest", "pico", "phone"]), []);
});
