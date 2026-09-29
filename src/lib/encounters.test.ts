import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCustomLocation, addEncounter, allLocations, findSightings, methodsFor, removeCustomLocation, removeEncounter,
} from "./encounters.ts";
import type { Location, Run } from "./types.ts";

const mk = (): Run => ({
  schemaVersion: 1, id: "x", name: "x", gameId: "black", enabledCategories: [],
  pokemon: {}, encounters: {}, customLocations: [], createdAt: 0, updatedAt: 0,
});

test("addEncounter ohne Duplikate", () => {
  const r = mk();
  addEncounter(r, "route-1", "walk", 19);
  addEncounter(r, "route-1", "walk", 19);
  addEncounter(r, "route-1", "surf", 19);
  assert.deepEqual(r.encounters, { "route-1": { walk: [19], surf: [19] } });
});

test("removeEncounter räumt leere Arrays und Objekte weg", () => {
  const r = mk();
  addEncounter(r, "a", "walk", 1);
  addEncounter(r, "a", "walk", 2);
  addEncounter(r, "a", "surf", 3);
  removeEncounter(r, "a", "walk", 1);
  assert.deepEqual(r.encounters.a.walk, [2]);
  removeEncounter(r, "a", "walk", 2);
  assert.deepEqual(r.encounters, { a: { surf: [3] } });
  removeEncounter(r, "a", "surf", 3);
  assert.deepEqual(r.encounters, {});
});

test("removeEncounter mit unbekanntem Ziel ist ein No-op", () => {
  const r = mk();
  removeEncounter(r, "nope", "walk", 1);
  addEncounter(r, "a", "walk", 1);
  removeEncounter(r, "a", "walk", 99);
  removeEncounter(r, "a", "surf", 1);
  assert.deepEqual(r.encounters, { a: { walk: [1] } });
});

test("findSightings: Rückwärtssuche über Orte und Methoden", () => {
  const r = mk();
  addEncounter(r, "a", "surf", 7);
  addEncounter(r, "a", "walk", 7);
  addEncounter(r, "b", "gift", 7);
  addEncounter(r, "b", "walk", 8);
  assert.deepEqual(findSightings(r, 7), [
    { locationId: "a", method: "walk" },
    { locationId: "a", method: "surf" },
    { locationId: "b", method: "gift" },
  ]);
  assert.deepEqual(findSightings(r, 1), []);
});

test("eigene Orte: anlegen, anhängen, löschen inkl. Encounters", () => {
  const r = mk();
  const loc = addCustomLocation(r, "  Geheimhöhle ");
  assert.match(loc.id, /^custom-[0-9a-f-]{36}$/);
  assert.equal(loc.name, "Geheimhöhle");
  assert.deepEqual(loc.methods, []);
  addEncounter(r, loc.id, "walk", 1);
  const game: Location[] = [{ id: "route-1", name: "Route 1", methods: ["walk"] }];
  assert.deepEqual(allLocations(game, r).map((l) => l.id), ["route-1", loc.id]);
  removeCustomLocation(r, loc.id);
  assert.deepEqual(r.customLocations, []);
  assert.deepEqual(r.encounters, {});
  removeCustomLocation(r, "custom-unknown");
});

test("methodsFor vereinigt Ort und Run ohne Duplikate", () => {
  const r = mk();
  const loc: Location = { id: "l", name: "L", methods: ["walk", "surf"] };
  assert.deepEqual(methodsFor(loc, r), ["walk", "surf"]);
  addEncounter(r, "l", "surf", 1);
  addEncounter(r, "l", "gift", 1);
  addEncounter(r, "l", "headbutt", 1);
  assert.deepEqual(methodsFor(loc, r), ["walk", "surf", "headbutt", "gift"]);
});
