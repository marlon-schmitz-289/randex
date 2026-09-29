# Architektur

Alle Typen: `src/lib/types.ts`. Farben nur aus `src/app.css` (`--type-<id>`, `--color-type-<id>-foreground`,
`--stat-*`, Utilities `panel`/`panel-header`).

## Datenfluss

```
static/data/*.json ──fetch (1×, gecacht)──> data.ts ──GameData──┐
                                                                ├─> runs.svelte.ts (app-State, Runes) ─> UI
Tauri-Commands (runs/<id>.json) <──invoke (entprellt)───────────┘
```

Das **Spiel** (`Run.gameId`) bestimmt die Generation. `GameData` enthält nur, was bis zu dieser Gen
existiert (Species, Typen, Attacken, Fähigkeiten) plus die Orte des Spiels. Fähigkeiten gibt es ab Gen 3.

## Stammdaten (`static/`)

| Datei | Inhalt |
| --- | --- |
| `data/games.json` | `Game[]`, Erscheinungsreihenfolge |
| `data/species.json` | `Species[]`, nach id |
| `data/moves.json`, `data/abilities.json` | `Move[]`, `Ability[]`, nach name |
| `data/types.json` | `TypeInfo[]` (ohne unknown/shadow/stellar) |
| `data/locations/<gameId>.json` | `Location[]`, existiert für jedes Spiel (ggf. `[]`) |
| `data/maps/<region>.json` | `RegionMap` (schematisch, von Hand/Agent gezeichnet; `src/lib/maps.test.ts` prüft Vollständigkeit) |
| `data/badges.json` | `Record<gameId, Badge[]>` (von Hand gepflegt) |
| `sprites/<speciesId>.png` | 96×96 Front-Sprite |
| `badges/<n>.png` | Orden-Bilder (PokeAPI-Nummerierung) |

Erzeugt einmalig von `scripts/generate-data.mjs` (PokeAPI, deutsche Namen, Fallback englisch).
PokeAPI-Encounter-Methoden werden auf `ENCOUNTER_METHODS` gemappt, Unbekanntes → `other`.
Orte = PokeAPI-Locations (Areas zusammengefasst), nur solche mit Encountern in diesem Spiel.
`Location.slots` = Anzahl verschiedener Original-Species je Methode (für Area-/Global-1:1).

## Run-Speicherung (Rust, `src-tauri/src/lib.rs`)

`<AppData>/runs/<id>.json`, atomar (`<id>.json.tmp` schreiben, dann `rename`). Rust behandelt den Run
als `serde_json::Value`; es prüft nur `id` (`[A-Za-z0-9-]+`), bei Import zusätzlich `id`, `name`,
`gameId` (Strings) und `schemaVersion` (Zahl ≤ 1). Fehler = deutscher `String`.

| Command (invoke-Args camelCase) | Rückgabe |
| --- | --- |
| `list_runs()` | `RunSummary[]`, `updatedAt` absteigend; kaputte Dateien übersprungen |
| `load_run({ id })` | `Run` |
| `save_run({ run })` | `void` |
| `delete_run({ id })` | `void` |
| `export_run({ run, path })` | `void` (hübsch formatiertes JSON) |
| `import_run({ path })` | `Run` (geprüft, **nicht** gespeichert) |

Pfade für Export/Import kommen aus `@tauri-apps/plugin-dialog` (`save`/`open`, Filter `json`).

## Frontend-Module (`src/lib`)

`search.ts` und `encounters.ts` sind rein (kein Svelte, kein `$lib`, relative Imports mit `.ts`),
damit `node --test src/lib/*.test.ts` sie testet.

```ts
// data.ts
interface GameData { game: Game; species: Species[]; speciesById: Map<number, Species>;
  types: TypeInfo[]; typesById: Map<TypeId, TypeInfo>; moves: Move[]; abilities: Ability[];
  locations: Location[] }
loadGames(): Promise<Game[]>
loadGameData(gameId: string): Promise<GameData>   // Basisdateien 1× laden, pro gameId gecacht
categoriesForGeneration(gen: number): Category[]  // ohne "abilities" bei gen < 3
spriteUrl(speciesId: number): string              // "/sprites/<id>.png"

// search.ts
type EntryFilter = "all" | "entered" | "missing"
interface SearchOptions { query: string; filter: EntryFilter; type: TypeId | null }
normalize(s: string): string                      // klein, ohne Diakritika
hasEntry(run: Run, speciesId: number): boolean    // Eintrag existiert (updateEntry entfernt leere)
searchSpecies(species: Species[], run: Run, opts: SearchOptions): Species[]
  // Nummer ("25", "#025") → id; Name: Präfix > Teilstring > Teilfolge; sonst Dex-Reihenfolge

// encounters.ts (mutieren den übergebenen Run; im UI nur über mutate() aufrufen)
findSightings(run: Run, speciesId: number): Sighting[]
addEncounter(run: Run, locationId: string, method: EncounterMethod, speciesId: number): void
removeEncounter(run: Run, locationId: string, method: EncounterMethod, speciesId: number): void
  // räumt leere Arrays/Objekte weg
addCustomLocation(run: Run, name: string): Location          // id "custom-<uuid>", methods []
removeCustomLocation(run: Run, locationId: string): void      // löscht auch encounters[id]
allLocations(gameLocations: Location[], run: Run): Location[] // Spielorte + eigene (hinten)
methodsFor(location: Location, run: Run): EncounterMethod[]   // location.methods ∪ benutzte

// runs.svelte.ts – Runes-State; Funktionen fangen Fehler selbst ab (toast.error), werfen nie
const app: {
  runs: RunSummary[]; current: Run | null /* deep $state */; data: GameData | null /* $state.raw */;
  loading: boolean; readonly activeCategories: Category[] /* enabled ∩ categoriesForGeneration */;
  view: View; selectedSpeciesId: number | null; selectedLocationId: string | null }
interface RunInput { name: string; gameId: string; seed?: string; note?: string;
  enabledCategories: Category[] }
initRuns(): Promise<void>                // list_runs, öffnet zuletzt benutzten (localStorage "randex.lastRunId")
openRun(id: string): Promise<void>       // flushSave, load_run, loadGameData, Auswahl zurücksetzen
createRun(input: RunInput): Promise<Run | null>   // speichert sofort und öffnet
updateRunMeta(patch: Partial<RunInput>): Promise<void>  // Spielwechsel lädt GameData neu
deleteRun(id: string): Promise<void>
mutate(fn: (run: Run) => void): void     // einzige Schreibstelle für app.current; setzt updatedAt, speichert entprellt (500 ms)
updateEntry(speciesId: number, patch: Partial<PokemonEntry>): void  // via mutate; undefined löscht Feld
flushSave(): Promise<void>
exportCurrentRun(): Promise<void>
importRunFromFile(): Promise<void>       // bei id-Kollision neue id, dann speichern + öffnen
showLocation(locationId: string): void   // view = "routes"
showSpecies(speciesId: number): void     // view = "pokemon"
```

Neuer Run: Standardkategorien `types`, `moves`, `note`.

## UI (`src/lib/components/app/`)

Alle Komponenten lesen/schreiben über `app` und die Funktionen aus `runs.svelte.ts`; keine eigenen Stores.

| Datei | Agent | Props |
| --- | --- | --- |
| `src/routes/+page.svelte` | shell | – (rendert `AppShell`, ruft `initRuns()`) |
| `AppShell.svelte` | shell | – Kopfzeile, Run-Wechsler, Export/Import/Löschen, Ansicht Pokémon ⇄ Routen, Hell/Dunkel (`mode-watcher`), Leerzustand ohne Run |
| `RunDialog.svelte` | shell | `open: boolean` (bindable), `run?: Run` (fehlt = Anlegen) – Name, Spiel (nach Gen gruppiert), Seed, Notiz, Kategorie-Toggles (nur `categoriesForGeneration`) |
| `PokemonList.svelte` | list | – Suche, Filter, Typfilter, ↑↓, Tippen fokussiert Suche (nur ohne Fokus in Eingabefeld/Dialog) |
| `TypeBadge.svelte` | list | `id: TypeId`, `size?: "sm" \| "md"`, `class?` |
| `Sprite.svelte` | list | `id: number`, `size?: number` (px, Standard 40), `class?` – lazy, feste Größe, Platzhalter bei Fehler |
| `SpeciesPicker.svelte` | list | `value?: number \| string \| null`, `onSelect: (v: number \| string) => void`, `allowFreeText?: boolean`, `exclude?: number[]`, `placeholder?: string` – Popover + Command über `app.data.species` |
| `PokemonDetail.svelte`, `detail/*` | detail | – Editoren je `app.activeCategories`; Fundorte = `findSightings`, Klick → `showLocation` |
| `detail/NamePicker.svelte` | detail | `items: { name: string }[]`, `value: string`, `onSelect: (name: string) => void` – Autocomplete Attacken/Fähigkeiten, Freitext |
| `EncounterView.svelte`, `encounter/*` | encounter | – Ortsliste (Suche, `app.selectedLocationId`), Editor pro Methode, `SpeciesPicker` (`allowFreeText=false`), Methode hinzufügen, eigene Orte anlegen/löschen; Klick auf Pokémon → `showSpecies` |

## Besitz (parallel arbeitende Agents)

| Agent | Dateien |
| --- | --- |
| data | `scripts/generate-data.mjs`, `static/data/**`, `static/sprites/**` |
| rust | `src-tauri/**`, `package.json`/`package-lock.json` (nur `@tauri-apps/plugin-dialog`) |
| lib | `src/lib/data.ts`, `search.ts`, `encounters.ts`, `runs.svelte.ts`, `src/lib/*.test.ts` |
| shell / list / detail / encounter | siehe UI-Tabelle |

`types.ts`, `app.css`, `components/ui/**` sind fest; Änderungswünsche melden statt ändern.
