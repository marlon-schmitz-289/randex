// Gemeinsamer Vertrag für alle Module. Details: docs/ARCHITECTURE.md

// ---------- Stammdaten (static/data/*.json, per scripts/generate-data.mjs erzeugt) ----------

/** Typ-IDs = PokeAPI-Slugs. Farben kommen aus app.css (--type-<id>), nicht aus den Daten. */
export type TypeId =
  | "normal" | "fire" | "water" | "grass" | "electric" | "ice" | "fighting" | "poison" | "ground"
  | "flying" | "psychic" | "bug" | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

/** static/data/games.json – in Erscheinungsreihenfolge. */
export interface Game {
  /** PokeAPI-Version-Slug, z. B. "black", "black-2", "firered", "platinum" */
  id: string;
  /** Deutscher Name, z. B. "Schwarze Edition" */
  name: string;
  generation: number;
  /** Deutscher Regionsname, z. B. "Einall" */
  region: string;
}

/** static/data/species.json – nach id sortiert. Sprite: static/sprites/<id>.png */
export interface Species {
  /** Nationaldex-Nr. */
  id: number;
  name: string;
  generation: number;
}

/** static/data/moves.json – nach name sortiert. */
export interface Move {
  id: number;
  name: string;
  generation: number;
}

/** static/data/abilities.json – nach name sortiert. */
export interface Ability {
  id: number;
  name: string;
  generation: number;
}

/** static/data/types.json – in Spielreihenfolge (normal … fairy). */
export interface TypeInfo {
  id: TypeId;
  name: string;
  /** Eingeführt in Gen (dark/steel: 2, fairy: 6, sonst 1) */
  generation: number;
}

/** Encounter-Methoden; Labels in ENCOUNTER_METHOD_LABELS. */
export const ENCOUNTER_METHODS = [
  "walk", "dark-grass", "shaking", "surf", "surf-spots", "old-rod", "good-rod", "super-rod",
  "fishing-spots", "rock-smash", "headbutt", "gift", "static", "other",
] as const;
export type EncounterMethod = (typeof ENCOUNTER_METHODS)[number];

export const ENCOUNTER_METHOD_LABELS: Record<EncounterMethod, string> = {
  walk: "Gras/Höhle",
  "dark-grass": "Hohes Gras",
  shaking: "Raschelndes Gras/Staubwolke",
  surf: "Surfen",
  "surf-spots": "Wellen (Surfen)",
  "old-rod": "Angel",
  "good-rod": "Profiangel",
  "super-rod": "Superangel",
  "fishing-spots": "Wellen (Angeln)",
  "rock-smash": "Zertrümmerer",
  headbutt: "Kopfnuss",
  gift: "Geschenk",
  static: "Einzelbegegnung",
  other: "Sonstiges",
};

/** static/data/locations/<gameId>.json – Location[] (Datei existiert für JEDES Spiel, ggf. []). */
export interface Location {
  /** PokeAPI-Location-Slug, z. B. "unova-route-1"; eigene Orte: "custom-<uuid>" */
  id: string;
  name: string;
  /** Methoden, die es im Originalspiel dort gibt (Reihenfolge = Anzeige). Eigene Orte: [] */
  methods: EncounterMethod[];
  /** Verschiedene Original-Pokémon je Methode = Slots bei Area-/Global-Matching. Fehlt ohne Encounter-Daten. */
  slots?: Partial<Record<EncounterMethod, number>>;
}

/**
 * static/data/maps/<region>.json – schematische Regionskarte (eigene Zeichnung, keine Spielgrafik).
 * <region> = Game.region in Kleinbuchstaben, z. B. "einall". Koordinaten im viewBox 0..width/0..height.
 */
export interface RegionMap {
  width: number;
  height: number;
  /** Landmassen als Polygone (Umriss, nur zur Orientierung). */
  land: [number, number][][];
  places: MapPlace[];
}

export interface MapPlace {
  /** Location.id der Region; Orte ohne Encounter (nur zur Orientierung): "deco-<slug>" */
  id: string;
  label: string;
  kind: "city" | "route" | "water" | "cave" | "landmark";
  /** 1 Punkt = Markierung, ab 2 Punkten = Linie (Route/Seeweg). */
  points: [number, number][];
}

/** static/data/badges.json – Record<gameId, Badge[]>, in Spielreihenfolge. */
export interface Badge {
  id: string;
  name: string;
  leader: string;
  place: string;
  /** Überschrift, z. B. "Johto"/"Kanto" oder "Titanen" */
  group?: string;
  /** Bild: "/badges/<n>.png" oder bei Prüfungen/Titanen das Pokémon "/sprites/<id>.png" */
  sprite?: string;
}

// ---------- Run-Daten (App-Data-Dir/runs/<id>.json) ----------

export const SCHEMA_VERSION = 1;

export type Category = "types" | "moves" | "stats" | "abilities" | "evolutions" | "locations" | "note";

/** Reihenfolge für Toggles und Detailansicht. */
export const CATEGORIES: readonly Category[] = [
  "types", "moves", "stats", "abilities", "evolutions", "locations", "note",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  types: "Typen",
  moves: "Attacken",
  stats: "Stats",
  abilities: "Fähigkeiten",
  evolutions: "Entwicklungen",
  locations: "Fundorte",
  note: "Notiz",
};

export interface LevelMove {
  level: number;
  /** Name aus moves.json oder Freitext */
  move: string;
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Evolution {
  /** Species-ID oder Freitext */
  target: number | string;
  method: "level" | "item" | "other";
  /** Level als Zahl-String, Item-Name oder Freitext */
  value: string;
}

/**
 * Alle Felder optional; nur gesetzte Felder werden gespeichert.
 * Fundorte stehen NICHT hier, sondern werden aus Run.encounters abgeleitet.
 */
export interface PokemonEntry {
  types?: TypeId[];
  levelMoves?: LevelMove[];
  tmMoves?: string[];
  stats?: Stats;
  /** Namen aus abilities.json oder Freitext, 1–3 */
  abilities?: string[];
  evolutions?: Evolution[];
  note?: string;
}

/** locationId → Methode → Species-IDs (ohne Duplikate) */
export type Encounters = Record<string, Partial<Record<EncounterMethod, number[]>>>;

export interface Run {
  schemaVersion: number;
  /** crypto.randomUUID() */
  id: string;
  name: string;
  gameId: string;
  seed?: string;
  note?: string;
  /** Deaktivierte Kategorien behalten ihre Daten. */
  enabledCategories: Category[];
  /** Schlüssel = Species-ID (in JSON als String) */
  pokemon: Record<number, PokemonEntry>;
  encounters: Encounters;
  customLocations: Location[];
  /** Randomizer-Einstellung für wilde Pokémon; fehlt = aus. */
  wildMatching?: WildMatching;
  /** Aktuelles Team, max. 6. Fehlt in älteren Runs. */
  team?: TeamMember[];
  /** Erhaltene Orden (Badge.id des Spiels). Fehlt in älteren Runs. */
  badges?: string[];
  /** ms seit Epoch */
  createdAt: number;
  updatedAt: number;
}

/** UPR ZX: "Area 1-to-1" bzw. "Global 1-to-1 Mapping" – die Anzahl verschiedener Pokémon je Gebiet bleibt gleich. */
export type WildMatching = "area" | "global";

export const WILD_MATCHING_LABELS: Record<WildMatching, string> = {
  area: "Area 1:1 (pro Gebiet)",
  global: "Global 1:1",
};

export interface TeamMember {
  speciesId: number;
  nickname?: string;
  level?: number;
}

export const TEAM_SIZE = 6;

/** Rückgabe von list_runs */
export interface RunSummary {
  id: string;
  name: string;
  gameId: string;
  updatedAt: number;
}

/** Fundort eines Pokémon (Rückwärtssuche) */
export interface Sighting {
  locationId: string;
  method: EncounterMethod;
}

export type View = "pokemon" | "routes" | "progress";
