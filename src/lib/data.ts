import { CATEGORIES } from "./types.ts";
import type { Ability, Badge, Category, Game, Location, Move, RegionMap, Species, TypeInfo } from "./types.ts";

export interface GameData {
  game: Game;
  species: Species[];
  speciesById: Map<number, Species>;
  types: TypeInfo[];
  typesById: Map<string, TypeInfo>;
  moves: Move[];
  abilities: Ability[];
  locations: Location[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Ein Promise pro Schlüssel; bei Fehler verworfen, damit Retry möglich ist. */
function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key);
  if (!p) {
    p = load().catch((e: unknown) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, p);
  }
  return p;
}

const ABILITIES_FROM_GEN = 3;

const base = new Map<string, Promise<unknown>>();
const games = new Map<string, Promise<GameData>>();

// Cache ist untypisiert, hier wird auf den Dateityp eingeengt.
const baseFile = <T>(name: string) => cached(base, name, () => getJson<T>(`/data/${name}.json`)) as Promise<T>;

export const loadGames = (): Promise<Game[]> => baseFile<Game[]>("games");

export function loadGameData(gameId: string): Promise<GameData> {
  return cached(games, gameId, async () => {
    const [all, species, types, moves, abilities, locations] = await Promise.all([
      loadGames(),
      baseFile<Species[]>("species"),
      baseFile<TypeInfo[]>("types"),
      baseFile<Move[]>("moves"),
      baseFile<Ability[]>("abilities"),
      getJson<Location[]>(`/data/locations/${encodeURIComponent(gameId)}.json`),
    ]);
    const game = all.find((g) => g.id === gameId);
    if (!game) throw new Error(`Unbekanntes Spiel: ${gameId}`);
    const gen = game.generation;
    const sp = species.filter((s) => s.generation <= gen);
    const ty = types.filter((t) => t.generation <= gen);
    return {
      game,
      species: sp,
      speciesById: new Map(sp.map((s) => [s.id, s])),
      types: ty,
      typesById: new Map(ty.map((t) => [t.id, t])),
      moves: moves.filter((m) => m.generation <= gen),
      abilities: gen < ABILITIES_FROM_GEN ? [] : abilities.filter((a) => a.generation <= gen),
      locations,
    };
  });
}

const maps = new Map<string, Promise<RegionMap>>();

/** Schematische Karte der Region, z. B. "Einall" → /data/maps/einall.json */
export function loadRegionMap(region: string): Promise<RegionMap> {
  const key = region.toLowerCase();
  return cached(maps, key, () => getJson<RegionMap>(`/data/maps/${encodeURIComponent(key)}.json`));
}

/** Orden/Prüfungen des Spiels; unbekanntes Spiel → []. */
export const loadBadges = async (gameId: string): Promise<Badge[]> =>
  (await baseFile<Record<string, Badge[]>>("badges"))[gameId] ?? [];

export function categoriesForGeneration(gen: number): Category[] {
  return CATEGORIES.filter((c) => c !== "abilities" || gen >= ABILITIES_FROM_GEN);
}

export const spriteUrl = (id: number): string => `/sprites/${id}.png`;
