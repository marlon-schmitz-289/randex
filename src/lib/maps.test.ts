import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { Badge, Game, Location, RegionMap } from "./types.ts";

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(`../../static/data/${path}`, import.meta.url), "utf8")) as T;
const games = read<Game[]>("games.json");

for (const region of new Set(games.map((g) => g.region))) {
  test(`Karte ${region}: jeder Ort genau einmal, nur bekannte ids, alles im Rahmen`, () => {
    const map = read<RegionMap>(`maps/${region.toLowerCase()}.json`);
    const ids = new Set(
      games.filter((g) => g.region === region).flatMap((g) => read<Location[]>(`locations/${g.id}.json`).map((l) => l.id)),
    );
    const seen = new Set<string>();
    for (const p of map.places) {
      assert.ok(!seen.has(p.id), `doppelt: ${p.id}`);
      seen.add(p.id);
      assert.ok(ids.has(p.id) || p.id.startsWith("deco-"), `unbekannte id: ${p.id}`);
      assert.ok(p.label.trim(), `ohne Label: ${p.id}`);
      assert.ok(p.points.length >= 1, `ohne Punkte: ${p.id}`);
      for (const [x, y] of p.points) assert.ok(x >= 0 && y >= 0 && x <= map.width && y <= map.height, `außerhalb: ${p.id}`);
    }
    const missing = [...ids].filter((id) => !seen.has(id));
    assert.deepEqual(missing, [], `fehlen auf der Karte`);
  });
}

test("Orte: je Spiel eindeutige ids, keine eigenen (custom-)", () => {
  for (const g of games) {
    const ids = read<Location[]>(`locations/${g.id}.json`).map((l) => l.id);
    assert.equal(new Set(ids).size, ids.length, `doppelte Orte in ${g.id}`);
    assert.ok(!ids.some((id) => id.startsWith("custom-")), `custom-id in ${g.id}`);
  }
});

test("badges.json: nur bekannte Spiele, eindeutige ids, Bilder vorhanden", () => {
  const badges = read<Record<string, Badge[]>>("badges.json");
  const known = new Set(games.map((g) => g.id));
  for (const [gameId, list] of Object.entries(badges)) {
    assert.ok(known.has(gameId), `unbekanntes Spiel: ${gameId}`);
    assert.equal(new Set(list.map((b) => b.id)).size, list.length, `doppelte Orden in ${gameId}`);
    for (const b of list) {
      assert.ok(b.name.trim() && b.leader.trim() && b.place.trim(), `unvollständig: ${gameId}/${b.id}`);
      if (b.sprite) assert.ok(existsSync(new URL(`../../static${b.sprite}`, import.meta.url)), `Bild fehlt: ${b.sprite}`);
    }
  }
});
