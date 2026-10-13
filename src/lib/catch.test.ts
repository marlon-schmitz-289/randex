import { test } from "node:test";
import assert from "node:assert/strict";
import { ballsFor, catchChance } from "./catch.ts";

const [poke, great, ultra] = ballsFor(4, []);
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.001, `${actual} ≠ ${expected}`);

test("catchChance: Gen 3–4 mit Schüttelproben", () => {
  near(catchChance(4, 3, 1, "none", poke), 0.00416);
  near(catchChance(4, 45, 0, "sleep", ultra), 0.7847);
  assert.equal(catchChance(3, 255, 0, "none", poke), 1);
  near(catchChance(3, 255, 1, "none", poke), 0.3369);
});

test("catchChance: Gen 6+ mit Statusfaktor 2,5", () => {
  near(catchChance(6, 45, 0, "sleep", ultra), 0.9104);
});

test("catchChance: Gen 1 und 2 eigene Formeln, mehr KP-Verlust hilft immer", () => {
  for (const gen of [1, 2, 3, 5, 7]) {
    assert.ok(catchChance(gen, 45, 0, "none", great) > catchChance(gen, 45, 1, "none", great), `Gen ${gen}`);
  }
  near(catchChance(2, 3, 1, "none", poke), 2 / 256);
});

test("ballsFor: Netzball nur bei Wasser/Käfer, Flott-/Finsterball ab Gen 4", () => {
  assert.deepEqual(ballsFor(3, ["water"]).map((b) => b.id), ["poke", "great", "ultra", "net"]);
  assert.deepEqual(ballsFor(5, ["fire"]).map((b) => b.id), ["poke", "great", "ultra", "dusk", "quick"]);
  assert.equal(ballsFor(5, []).find((b) => b.id === "quick")?.factor, 5);
});
