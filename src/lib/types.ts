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
  /** Fangrate 3–255 (aktueller Stand, ältere Spiele weichen selten ab) */
  captureRate: number;
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
  /** Landmassen als Polygone (nur Umriss). */
  land: [number, number][][];
  /**
   * Gelände wie auf den Stadtkarten der Spiele, flach gefüllte Polygone auf dem Land (unter Routen und Orten).
   * Gezeichnet in Array-Reihenfolge, Späteres liegt oben: große Flächen zuerst, Seen/Flüsse in Bergen danach.
   */
  terrain?: MapTerrain[];
  places: MapPlace[];
}

export interface MapTerrain {
  /** water = Seen/Flüsse im Land (das Meer ist der Hintergrund); sand = Wüste/Strand; snow = Schnee/Eis */
  kind: "mountain" | "forest" | "water" | "sand" | "snow";
  /** Umriss, mindestens 3 Punkte, innerhalb von width/height */
  points: [number, number][];
}

export interface MapPlace {
  /** Location.id der Region; Orte ohne Encounter (nur zur Orientierung): "deco-<slug>" */
  id: string;
  label: string;
  /** roaming = wandernde Pokémon: kein Punkt auf der Karte, sondern ein Knopf in der Ecke (points werden ignoriert) */
  kind: "city" | "route" | "water" | "cave" | "landmark" | "roaming";
  /**
   * 1 Punkt = Markierung, ab 2 Punkten = Linie (Route/Seeweg). Beide Linienenden schließen an (≤ 6 Einheiten)
   * an einen Ein-Punkt-Ort, an die Linie eines anderen Ortes oder an den Kartenrand an. Echte Sackgassen
   * enden an einem "deco-<slug>"-Ort (z. B. dem Haus oder der Landmarke am Ende).
   */
  points: [number, number][];
  /** Nur in diesen Spielen (Game.id); fehlt = in allen Spielen der Region. */
  games?: string[];
}

/** static/data/dexes.json – Record<gameId, Pokedex[]>, nur regionale Dexe (National = alle Arten). */
export interface Pokedex {
  id: string;
  name: string;
  /** Species-IDs in Dex-Reihenfolge */
  species: number[];
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

/** static/data/field-moves.json – Record<gameId, FieldMove[]>, in Erhalt-Reihenfolge. */
export interface FieldMove {
  id: string;
  /** z. B. "VM01 Zerschneider", "Glurak-Flieger", "Sprint" */
  name: string;
  place: string;
  /** wie/wann man sie bekommt */
  how: string;
  /** Badge.id desselben Spiels, die zur Nutzung nötig ist bzw. sie freischaltet */
  badge?: string;
  /** Icon: Item-Sprite `static/items/<item>.png` (Äon-Flöte, Rotom-Rad) oder Species-ID (Reit-/Partner-Pokémon);
   *  sonst VM-Disc bzw. Kreis */
  item?: string;
  pokemon?: number;
}

/**
 * static/data/original/<gameId>.json – Originaldaten des Spiels für Runs ohne Randomizer (nur Arten, die im
 * Spiel vorkommen; Regionalform des Spiels, sonst Standardform, sonst die Form mit Learnset).
 * Typen/Fähigkeiten/Stats wie in der Generation.
 */
export interface OriginalData {
  /** Move-ID → "TM24"/"VM03"/"TR05" (nur Attacken mit Nummer) */
  machines: Record<number, string>;
  /** Move-ID → Typ der Attacke in diesem Spiel (Farbe der Disc), gleiche Schlüssel wie `machines` */
  machineTypes: Record<number, TypeId>;
  /** tmMoves sind Lehrer-Attacken (Legenden: Arceus) */
  tutor?: true;
  pokemon: Record<number, OriginalPokemon>;
  /** locationId → Methode → Zeilen; {} = keine Encounter-Daten in PokeAPI */
  encounters: Record<string, Partial<Record<EncounterMethod, OriginalEncounter[]>>>;
}

/**
 * [speciesId, minLevel, maxLevel, Häufigkeit in %, Bedingung, Bereich]; leere Enden fehlen, Handgepflegtes hat nur
 * die ersten drei. Häufigkeit je Tageszeit [morgens, tagsüber, nachts] oder Jahreszeit [Frühling, Sommer, Herbst,
 * Winter], 0 = dann nicht da. Bedingung = Alternativen als Schlüssel, mit Leerzeichen getrennt (z. B. "swarm-yes"),
 * Bereich z. B. "1.UG" (nur bei Orten mit mehreren).
 */
export type OriginalEncounter = [number, number, number, (number | number[])?, string?, string?];

export interface OriginalPokemon {
  types: TypeId[];
  /** Deutsche Namen [Slot 1, Slot 2, versteckt], fehlender Slot = ""; vor Gen 3 leer */
  abilities: string[];
  /** Gen 1: spa = spd = Spezial */
  stats: Stats;
  /** [Level, Move-ID]; Level 0 = bei Entwicklung */
  levelMoves: [number, number][];
  /** Move-IDs, nach Label sortiert (Label in OriginalData.machines); Legenden: Arceus: Lehrer-Attacken */
  tmMoves: number[];
  evolutions: (Evolution & { target: number })[];
}

// ---------- Run-Daten (App-Data-Dir/runs/<id>.json) ----------

// Muss mit SCHEMA_VERSION in src-tauri/src/lib.rs übereinstimmen.
export const SCHEMA_VERSION = 1;

/** Reihenfolge für Toggles und Detailansicht. */
export const CATEGORIES = ["types", "moves", "stats", "abilities", "evolutions", "locations", "catch", "note"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  types: "Typen",
  moves: "Attacken",
  stats: "Stats",
  abilities: "Fähigkeiten",
  evolutions: "Entwicklungen",
  locations: "Fundorte",
  catch: "Fangchance",
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
  id: string;
  name: string;
  gameId: string;
  seed?: string;
  note?: string;
  /** Nur `false` wird gespeichert; fehlt = Randomizer-Run. */
  randomized?: false;
  /** Deaktivierte Kategorien behalten ihre Daten. */
  enabledCategories: Category[];
  /** Schlüssel = Species-ID (in JSON als String) */
  pokemon: Record<number, PokemonEntry>;
  encounters: Encounters;
  customLocations: Location[];
  /** Randomizer-Einstellung für wilde Pokémon; fehlt = aus. */
  wildMatching?: WildMatching;
  /** Fehlt in älteren Runs. */
  team?: TeamMember[];
  /** Erhaltene Orden (Badge.id des Spiels). Fehlt in älteren Runs. */
  badges?: string[];
  /** Abgehakte FieldMove.id. Fehlt in älteren Runs. */
  fieldMoves?: string[];
  /** Spielstand-Ansicht an; nur `true` wird gespeichert. */
  saveGame?: true;
  /** Zuletzt eingelesener Spielstand; bleibt beim Ausschalten erhalten. */
  save?: SaveSnapshot;
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

// ---------- Spielstand (src-tauri/src/savefile.rs, static/data/savegame.json) ----------

/** Gen-3-Spiele (Feuerrot/Blattgrün eingeschlossen) und Gen 5 */
export const SAVE_GAMES = new Set(["ruby", "sapphire", "emerald", "firered", "leafgreen", "black", "white", "black-2", "white-2"]);

export interface PartyStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface SaveMon {
  speciesId: number;
  /** Gen 3 auch ohne Spitzname gesetzt (Artname in Großbuchstaben) */
  nickname: string | null;
  exp: number;
  /** Item-Nummer der Generation, 0 = keins */
  item: number;
  /** Move-IDs (wie moves.json) */
  moves: number[];
  /** Wesen-Nummer im Spiel (0–24), Name in SavegameData.natures */
  nature: number;
  ivs: Stats;
  evs: Stats;
  /** Nur im Team */
  level?: number;
  stats?: PartyStats;
}

export interface SaveBox {
  name: string;
  /** 30 Plätze, null = leer */
  mons: (SaveMon | null)[];
}

export type PocketId = "items" | "keyItems" | "balls" | "tms" | "berries" | "medicine" | "pc";

export interface SavePocket {
  id: PocketId;
  /** [Item-Nummer, Anzahl] */
  items: [number, number][];
}

export interface SaveSnapshot {
  /** ms seit Epoch */
  readAt: number;
  team: SaveMon[];
  boxes: SaveBox[];
  bag: SavePocket[];
}

/** static/data/savegame.json */
export interface SavegameData {
  /** Generation → Item-Nummer → Name */
  items: Record<string, Record<string, string>>;
  /** Generation → Item-Nummer → Icon-Datei in static/items (ohne .png); fehlt = kein Icon */
  icons: Record<string, Record<string, string>>;
  /** Species-ID → Wachstumsrate (1–6) */
  growth: number[];
  /** [Wachstumsrate - 1][Level - 1] = EXP ab diesem Level */
  experience: number[][];
  /** Deutsche Wesen-Namen nach Nummer im Spiel */
  natures: string[];
}

export interface RunSummary {
  id: string;
  name: string;
  gameId: string;
  updatedAt: number;
}

export interface Sighting {
  locationId: string;
  method: EncounterMethod;
}

export type View = "pokemon" | "routes" | "progress" | "save";
