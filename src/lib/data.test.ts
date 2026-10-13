import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriesForGeneration, loadGameData, loadOriginal, loadRegionMap } from "./data.ts";

const files: Record<string, unknown> = {
  "/data/games.json": [
    { id: "red", name: "Rot", generation: 1, region: "Kanto" },
    { id: "black", name: "Schwarz", generation: 5, region: "Einall" },
  ],
  "/data/species.json": [{ id: 1, name: "Bisasam", generation: 1 }, { id: 650, name: "Igamaro", generation: 6 }],
  "/data/types.json": [{ id: "dark", name: "Unlicht", generation: 2 }, { id: "fairy", name: "Fee", generation: 6 }],
  "/data/moves.json": [{ id: 1, name: "Pfund", generation: 1 }, { id: 2, name: "Zauberschein", generation: 6 }],
  "/data/abilities.json": [{ id: 1, name: "Duftnote", generation: 3 }, { id: 2, name: "Flauschigkeit", generation: 7 }],
  "/data/dexes.json": { black: [{ id: "unova", name: "Einall", species: [1] }] },
  "/data/locations/red.json": [],
  "/data/locations/black.json": [],
  "/data/locations/nope.json": [],
  "/data/maps/einall.json": { width: 1, height: 1, land: [], places: [] },
  "/data/original/red.json": {
    machines: { 1: "TM01" },
    pokemon: {},
    encounters: { "kanto-route-1": { walk: [[16, 2, 5], [19, 2, 4]], "old-rod": [[129, 5, 5]] } },
  },
};
const calls: string[] = [];
let failNext = false;

globalThis.fetch = (async (input: string) => {
  calls.push(input);
  if (failNext) {
    failNext = false;
    return new Response(null, { status: 500 });
  }
  return input in files ? Response.json(files[input]) : new Response(null, { status: 404 });
}) as typeof fetch;

test("Schwarz (Gen 5) filtert neuere Arten, Typen, Attacken, Fähigkeiten", async () => {
  const d = await loadGameData("black");
  assert.deepEqual(d.species.map((s) => s.id), [1]);
  assert.deepEqual(d.types.map((t) => t.id), ["dark"]);
  assert.deepEqual(d.moves.map((m) => m.id), [1]);
  assert.deepEqual(d.abilities.map((a) => a.id), [1]);
  assert.equal(d.speciesById.get(650), undefined);
  assert.deepEqual(d.dexes.map((x) => x.id), ["unova"]);
});

test("Rot (Gen 1): keine Fähigkeiten, auch nicht als Kategorie", async () => {
  const d = await loadGameData("red");
  assert.deepEqual(d.abilities, []);
  assert.deepEqual(d.types, []);
  assert.ok(!categoriesForGeneration(1).includes("abilities"));
  assert.ok(categoriesForGeneration(3).includes("abilities"));
});

test("unbekanntes Spiel wird abgelehnt", async () => {
  await assert.rejects(loadGameData("nope"), /Unbekanntes Spiel/);
});

test("Cache: ein Fetch pro Datei, Schreibweise egal, Retry nach Fehler", async () => {
  failNext = true;
  await assert.rejects(loadRegionMap("Einall"), /HTTP 500/);
  const n = calls.length;
  await loadRegionMap("Einall");
  await loadRegionMap("einall");
  assert.equal(calls.length, n + 1);
});

test("loadOriginal: Species-Encounter aus den Tripeln, Move-Namen, Cache, Retry nach Fehler", async () => {
  failNext = true;
  await assert.rejects(loadOriginal("red"), /HTTP 500/);
  const o = await loadOriginal("red");
  assert.equal(await loadOriginal("red"), o);
  assert.equal(calls.filter((c) => c === "/data/original/red.json").length, 2);
  assert.deepEqual(o.speciesEncounters, { "kanto-route-1": { walk: [16, 19], "old-rod": [129] } });
  assert.equal(o.movesById.get(1), "Pfund");
});
