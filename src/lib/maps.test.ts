import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Game, Location, RegionMap } from "./types.ts";

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
