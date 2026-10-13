import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStats, calcStatsGb, fieldMovesInBag, itemIcon, itemName, levelOf, natureEffect, ownNickname } from "./savegame.ts";
import type { SavegameData, SaveMon } from "./types.ts";

const data: SavegameData = {
  items: { 5: { 17: "Trank", 420: "VM01", 422: "VM03" } },
  icons: { 5: { 17: "medicine-potion" } },
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
  assert.equal(itemIcon(data, 5, 17), "/items/medicine-potion.png");
  assert.equal(itemIcon(data, 3, 17), undefined);
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

test("fieldMovesInBag: nur VMs im Beutel, andere Feldfähigkeiten bleiben manuell", () => {
  const moves = [
    { id: "cut", name: "VM01 Zerschneider", place: "", how: "" },
    { id: "fly", name: "VM02 Fliegen", place: "", how: "" },
    { id: "surf", name: "VM03 Surfer", place: "", how: "" },
    { id: "ride", name: "Reit-Pokémon", place: "", how: "" },
  ];
  const bag = [{ id: "tms" as const, items: [[420, 1], [422, 1]] as [number, number][] }];
  assert.deepEqual(fieldMovesInBag(moves, bag, data, 5), ["cut", "surf"]);
  assert.deepEqual(fieldMovesInBag(moves, bag, data, 3), []);
});

test("calcStatsGb: Gen-1-Pikachu wie im Spiel (PKHeX)", () => {
  const base = { hp: 35, atk: 55, def: 30, spa: 50, spd: 50, spe: 90 };
  const pika: SaveMon = {
    ...mon(12167, 23),
    ivs: { hp: 11, atk: 13, def: 10, spa: 3, spd: 3, spe: 7 },
    evs: { hp: 1234, atk: 0, def: 0, spa: 777, spd: 777, spe: 0 },
  };
  assert.deepEqual(calcStatsGb(base, pika, 23), { hp: 56, atk: 36, def: 23, spa: 30, spd: 30, spe: 49 });
});
