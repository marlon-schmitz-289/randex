import { test } from "node:test";
import assert from "node:assert/strict";
import { hasEntry, normalize, searchSpecies } from "./search.ts";
import type { Run, Species } from "./types.ts";

const species: Species[] = [
  { id: 1, name: "Bisasam", generation: 1 },
  { id: 25, name: "Pikachu", generation: 1 },
  { id: 26, name: "Raichu", generation: 1 },
  { id: 250, name: "Ho-Oh", generation: 2 },
  { id: 386, name: "Flabébé", generation: 6 },
  { id: 400, name: "Pichu", generation: 2 },
];

const run = (pokemon: Run["pokemon"]): Run => ({
  schemaVersion: 1, id: "x", name: "x", gameId: "black", enabledCategories: [],
  pokemon, encounters: {}, customLocations: [], createdAt: 0, updatedAt: 0,
});
const ids = (l: Species[]) => l.map((s) => s.id);
const all = { query: "", filter: "all", type: null } as const;

test("normalize entfernt Diakritika", () => {
  assert.equal(normalize("  Flabébé "), "flabebe");
});

test("hasEntry prüft nur die Existenz des Eintrags", () => {
  assert.equal(hasEntry(run({}), 1), false);
  assert.equal(hasEntry(run({ 1: { note: "x" } }), 1), true);
  assert.equal(hasEntry(run({ 1: { types: ["fire"] } }), 1), true);
});

test("leere Suche liefert alles in Dex-Reihenfolge", () => {
  assert.deepEqual(ids(searchSpecies(species, run({}), all)), [1, 25, 26, 250, 386, 400]);
});

test("Nummernsuche mit und ohne #/Nullen", () => {
  for (const q of ["25", "#025", "025"]) assert.deepEqual(ids(searchSpecies(species, null, { ...all, query: q })), [25]);
  assert.deepEqual(searchSpecies(species, null, { ...all, query: "999" }), []);
});

test("Rang: Präfix vor Teilstring vor Teilfolge", () => {
  const q = (query: string) => ids(searchSpecies(species, null, { ...all, query }));
  assert.deepEqual(q("chu"), [25, 26, 400]);
  assert.deepEqual(q("ich"), [26, 400, 25]); // Teilstring (Raichu, Pichu), dann Teilfolge (Pikachu)
  assert.deepEqual(q("pi"), [25, 400]);
  assert.deepEqual(q("pu"), [25, 400]);
});

test("Akzente und Groß-/Kleinschreibung", () => {
  assert.deepEqual(ids(searchSpecies(species, null, { ...all, query: "FLABEBE" })), [386]);
  assert.deepEqual(ids(searchSpecies(species, null, { ...all, query: "ho-oh" })), [250]);
});

test("Filter entered/missing und Typ", () => {
  const r = run({ 25: { types: ["electric"] }, 26: { note: "n" } });
  assert.deepEqual(ids(searchSpecies(species, r, { ...all, filter: "entered" })), [25, 26]);
  assert.deepEqual(ids(searchSpecies(species, r, { ...all, filter: "missing" })), [1, 250, 386, 400]);
  assert.deepEqual(ids(searchSpecies(species, r, { ...all, type: "electric" })), [25]);
  assert.deepEqual(ids(searchSpecies(species, r, { query: "chu", filter: "entered", type: "electric" })), [25]);
});

test("ohne Run: Typfilter/entered leer, missing alles", () => {
  assert.deepEqual(searchSpecies(species, null, { ...all, type: "fire" }), []);
  assert.equal(searchSpecies(species, null, { ...all, filter: "missing" }).length, species.length);
});
