import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStats, itemName, levelOf, natureEffect, ownNickname } from "./savegame.ts";
import type { SavegameData, SaveMon } from "./types.ts";

const data: SavegameData = {
  items: { 5: { 17: "Trank" } },
  growth: [0, 2],
  experience: [[], [0, 8, 27, 64]],
  natures: [],
};
const zero = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const mon = (exp: number, level?: number): SaveMon => ({
  speciesId: 1, nickname: null, exp, item: 0, moves: [], nature: 0, ivs: zero, evs: zero, level,
});

test("levelOf", () => {
  assert.equal(levelOf(mon(0), data), 1);
  assert.equal(levelOf(mon(26), data), 2);
  assert.equal(levelOf(mon(27), data), 3);
  assert.equal(levelOf(mon(1000), data), 4);
  assert.equal(levelOf(mon(0, 50), data), 50);
});

test("itemName", () => {
  assert.equal(itemName(data, 5, 17), "Trank");
  assert.equal(itemName(data, 3, 17), "Item #17");
});

test("ownNickname", () => {
  assert.equal(ownNickname({ ...mon(0), nickname: "BISASAM" }, "Bisasam"), undefined);
  assert.equal(ownNickname({ ...mon(0), nickname: "Bisi" }, "Bisasam"), "Bisi");
  assert.equal(ownNickname(mon(0), "Bisasam"), undefined);
});

test("natureEffect", () => {
  assert.deepEqual(natureEffect(0), {});
  assert.deepEqual(natureEffect(7), { up: "def", down: "spe" });
  assert.deepEqual(natureEffect(15), { up: "spa", down: "atk" });
});

test("calcStats wie PKHeX", () => {
  // Zoroark Lv. 23, Locker (+Vert. −Init.), Werte aus einem PKHeX-Spielstand
  const zoroark: SaveMon = {
    ...mon(0),
    speciesId: 571,
    nature: 7,
    ivs: { hp: 31, atk: 1, def: 2, spa: 4, spd: 5, spe: 3 },
    evs: { hp: 252, atk: 10, def: 20, spa: 40, spd: 50, spe: 30 },
  };
  const base = { hp: 60, atk: 105, def: 60, spa: 120, spd: 60, spe: 105 };
  assert.deepEqual(calcStats(base, zoroark, 23), { hp: 82, atk: 53, def: 37, spa: 63, spd: 36, spe: 49 });
  assert.equal(calcStats(base, { ...zoroark, speciesId: 292 }, 50).hp, 1);
});
