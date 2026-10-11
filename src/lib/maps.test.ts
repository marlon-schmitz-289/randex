import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { Badge, FieldMove, Game, Location, MapPlace, Move, OriginalData, RegionMap, Species, TypeInfo } from "./types.ts";

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
      for (const g of p.games ?? []) assert.ok(games.some((x) => x.id === g && x.region === region), `fremdes Spiel ${g}: ${p.id}`);
      for (const g of games.filter((x) => x.region === region && p.games && !p.games.includes(x.id))) {
        // PokeAPI listet auch Orte, die es im Spiel nicht gibt; entscheidend sind Encounter-Daten
        assert.ok(!read<OriginalData>(`original/${g.id}.json`).encounters[p.id], `${p.id} hat Daten in ${g.id}, ist dort aber ausgeblendet`);
      }
      for (const [x, y] of p.points) assert.ok(x >= 0 && y >= 0 && x <= map.width && y <= map.height, `außerhalb: ${p.id}`);
    }
    const missing = [...ids].filter((id) => !seen.has(id));
    assert.deepEqual(missing, [], `fehlen auf der Karte`);
    const kinds = ["mountain", "forest", "water", "sand", "snow"];
    for (const t of map.terrain ?? []) {
      assert.ok(kinds.includes(t.kind) && t.points.length >= 3, `Gelände ${t.kind}: ungültig`);
      for (const [x, y] of t.points) assert.ok(x >= 0 && y >= 0 && x <= map.width && y <= map.height, `Gelände außerhalb: ${t.kind} ${x},${y}`);
    }
  });

  test(`Karte ${region}: jede Route schließt an beiden Enden an`, () => {
    const map = read<RegionMap>(`maps/${region.toLowerCase()}.json`);
    const loose = new Set<string>();
    // je Spiel, weil ausgeblendete Orte nicht als Anschluss zählen
    for (const g of games.filter((x) => x.region === region)) {
      const visible = map.places.filter((p) => !p.games || p.games.includes(g.id));
      for (const p of visible.filter((p) => p.points.length > 1)) {
        for (const end of [p.points[0], p.points[p.points.length - 1]]) {
          if (!connects(end, p, visible, map)) loose.add(`${p.id} @ ${end.join(",")}`);
        }
      }
    }
    assert.deepEqual([...loose], [], "lose Enden (Anschluss fehlt, Sackgasse → deco-Ort ans Ende)");
  });
}

const TOL = 6;

function segDist([px, py]: [number, number], [ax, ay]: [number, number], [bx, by]: [number, number]): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function connects(end: [number, number], self: MapPlace, places: MapPlace[], map: RegionMap): boolean {
  const [x, y] = end;
  if (x <= TOL || y <= TOL || x >= map.width - TOL || y >= map.height - TOL) return true;
  return places.some((o) =>
    o === self ? false
    : o.points.length === 1 ? Math.hypot(x - o.points[0][0], y - o.points[0][1]) <= TOL
    : o.points.slice(1).some((b, i) => segDist(end, o.points[i], b) <= TOL),
  );
}

test("Verbindungstest erkennt lose Enden", () => {
  const map: RegionMap = { width: 100, height: 100, land: [], places: [] };
  const city: MapPlace = { id: "a", label: "A", kind: "city", points: [[50, 50]] };
  const road: MapPlace = { id: "r", label: "R", kind: "route", points: [[50, 50], [50, 30]] };
  const side: MapPlace = { id: "s", label: "S", kind: "route", points: [[53, 40], [80, 40]] };
  const all = [city, road, side];
  assert.ok(connects([50, 50], road, all, map));
  assert.ok(connects([53, 40], side, all, map));
  assert.ok(!connects([50, 30], road, all, map));
  assert.ok(!connects([80, 40], side, all, map));
  assert.ok(connects([98, 40], side, all, map));
});

test("Orte: jeder sichtbare Nicht-Deko-Kartenort ist im Spiel auswählbar", () => {
  for (const g of games) {
    const ids = new Set(read<Location[]>(`locations/${g.id}.json`).map((l) => l.id));
    const places = read<RegionMap>(`maps/${g.region.toLowerCase()}.json`).places;
    const missing = places.filter((p) => !p.id.startsWith("deco-") && (!p.games || p.games.includes(g.id)) && !ids.has(p.id));
    assert.deepEqual(missing.map((p) => p.id), [], `fehlen in locations/${g.id}.json`);
  }
});

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

test("field-moves.json: jedes Spiel, eindeutige ids, vollständig, Orden existieren", () => {
  const fieldMoves = read<Record<string, FieldMove[]>>("field-moves.json");
  const badges = read<Record<string, Badge[]>>("badges.json");
  assert.deepEqual(Object.keys(fieldMoves).sort(), games.map((g) => g.id).sort());
  for (const [gameId, list] of Object.entries(fieldMoves)) {
    assert.equal(new Set(list.map((f) => f.id)).size, list.length, `doppelte ids in ${gameId}`);
    const badgeIds = new Set((badges[gameId] ?? []).map((b) => b.id));
    for (const f of list) {
      assert.ok(f.name.trim() && f.place.trim() && f.how.trim(), `unvollständig: ${gameId}/${f.id}`);
      if (f.badge) assert.ok(badgeIds.has(f.badge), `unbekannter Orden: ${gameId}/${f.id} → ${f.badge}`);
    }
  }
});

test("original/: je Spiel, Orte/Arten/Attacken/Typen passen zur Generation", () => {
  const speciesGen = new Map(read<Species[]>("species.json").map((s) => [s.id, s.generation]));
  const typeGen = new Map(read<TypeInfo[]>("types.json").map((t) => [t.id, t.generation]));
  const moveIds = new Set(read<Move[]>("moves.json").map((m) => m.id));
  for (const g of games) {
    const o = read<OriginalData>(`original/${g.id}.json`);
    const locIds = new Set(read<Location[]>(`locations/${g.id}.json`).map((l) => l.id));
    const ok = (id: number) => (speciesGen.get(id) ?? Infinity) <= g.generation;
    for (const [loc, byMethod] of Object.entries(o.encounters)) {
      assert.ok(locIds.has(loc), `unbekannter Ort: ${g.id}/${loc}`);
      for (const list of Object.values(byMethod)) for (const [id] of list) assert.ok(ok(id), `Art ${id} in ${g.id}/${loc}`);
    }
    for (const [id, p] of Object.entries(o.pokemon)) {
      assert.ok(ok(+id), `Art ${id} in ${g.id}`);
      for (const t of p.types) assert.ok((typeGen.get(t) ?? Infinity) <= g.generation, `Typ ${t} bei ${g.id}/${id}`);
      for (const m of [...p.levelMoves.map(([, m]) => m), ...p.tmMoves]) assert.ok(moveIds.has(m), `Attacke ${m} bei ${g.id}/${id}`);
      for (const e of p.evolutions) assert.ok(typeof e.target === "number" && e.target in o.pokemon, `Entwicklung ${g.id}/${id}`);
    }
  }
  const red = read<OriginalData>("original/red.json");
  assert.ok(red.pokemon[1].levelMoves.some(([, m]) => m === 22), "Bisasam lernt Rankenhieb");
  assert.equal(red.machines[57], "VM03");
});
