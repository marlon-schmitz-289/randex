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
| `data/dexes.json` | `Record<gameId, Pokedex[]>`, regionale Dexe in Dex-Reihenfolge (National = alle Arten) |
| `data/types.json` | `TypeInfo[]` (ohne unknown/shadow/stellar) |
| `data/locations/<gameId>.json` | `Location[]`, existiert für jedes Spiel |
| `data/original/<gameId>.json` | `OriginalData` für Runs ohne Randomizer: Typen/Fähigkeiten/Stats nach Generation, Level- und TM/VM-Attacken der Version-Group, Entwicklungen, Fundorte mit Level |
| `data/maps/<region>.json` | `RegionMap` (schematisch, von Hand gezeichnet; `src/lib/maps.test.ts` prüft Vollständigkeit) |
| `data/badges.json` | `Record<gameId, Badge[]>` (von Hand gepflegt) |
| `data/field-moves.json` | `Record<gameId, FieldMove[]>` (von Hand gepflegt; `badge` → `Badge.id` desselben Spiels, Icon: `item` → `items/<item>.png`, sonst `pokemon` = Species-ID) |
| `sprites/<speciesId>.png` | 96×96 Front-Sprite |
| `badges/<n>.png` | Orden-Bilder (PokeAPI-Nummerierung) |
| `items/<ordner>-<name>.png` | 32×32 Item-Icons (msikma/pokesprite, Gen-8-Stil) für Beutel, getragene Items und Feldfähigkeiten |

Erzeugt von `npm run generate` (`scripts/generate-data.mjs`; PokeAPI, deutsche Namen, Fallback englisch;
`maps/`, `badges.json` und `field-moves.json` fasst es nicht an).
PokeAPI-Encounter-Methoden werden auf `ENCOUNTER_METHODS` gemappt, Unbekanntes → `other`.
Orte = PokeAPI-Locations (Areas zusammengefasst) mit Encountern im Spiel; Spiele ohne Encounter-Daten
bekommen alle Orte ihrer Region (ohne `methods`). Dazu kommt jeder im Spiel sichtbare Nicht-`deco-`-Ort
der Regionskarte (Kartenlabel als Name, `methods: []`), damit jeder Kartenort auswählbar ist.
Handgepflegte Ergänzungen in `scripts/encounters/<gameId>.json` (Format siehe README dort) ersetzen je
(Ort, Methode) die PokeAPI-Einträge; `methods`/`slots` und `original/` werden aus dem gemergten Stand
berechnet, ungültige Ergänzungen brechen den Generator ab.
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
| `export_run({ run })` | `boolean` (false = Dialog abgebrochen; hübsch formatiertes JSON) |
| `import_run()` | `Run \| null` (geprüft, **nicht** gespeichert; null = abgebrochen) |
| `read_save({ gameId })` | Team, Boxen, Beutel, Orden-Bits, gefangene Arten, Name, Geld, Spielzeit oder `null` (Dialog abgebrochen); Parser in `savefile.rs` (Gen 1–9) |

Export/Import öffnen den Dateidialog im Backend (`tauri-plugin-dialog`, Filter `json`); das Webview
übergibt keine Pfade und braucht keine Dialog-Permissions.

## Frontend-Module (`src/lib`)

`search.ts`, `encounters.ts` und `entry.ts` sind rein (kein Svelte, kein `$lib`, relative Imports mit `.ts`),
damit `node --test src/lib/*.test.ts` sie testet.

```ts
// data.ts
interface GameData { game: Game; species: Species[]; speciesById: Map<number, Species>;
  types: TypeInfo[]; typesById: Map<TypeId, TypeInfo>; moves: Move[]; abilities: Ability[];
  locations: Location[] }
loadGames(): Promise<Game[]>
loadGameData(gameId: string): Promise<GameData>   // Basisdateien 1× laden, pro gameId gecacht
categoriesForGeneration(gen: number): Category[]  // ohne "abilities" bei gen < 3
loadRegionMap(region: string): Promise<RegionMap> // "Einall" → /data/maps/einall.json
loadBadges(gameId: string): Promise<Badge[]>      // unbekanntes Spiel → []
loadFieldMoves(gameId: string): Promise<FieldMove[]> // unbekanntes Spiel → []
loadOriginal(gameId: string): Promise<Original>   // OriginalData + movesById + speciesEncounters, gecacht
spriteUrl(speciesId: number): string              // "/sprites/<id>.png"

// search.ts
type EntryFilter = "all" | "entered" | "missing"
interface SearchOptions { query: string; filter: EntryFilter; type: TypeId | null;
  typesOf?: (speciesId: number) => readonly TypeId[] | undefined }  // Quelle für den Typfilter
normalize(s: string): string                      // klein, ohne Diakritika
hasEntry(run: Run, speciesId: number): boolean    // Eintrag existiert (updateEntry entfernt leere)
searchSpecies(species: Species[], run: Run | null, opts: SearchOptions): Species[]
  // Nummer ("25", "#025") → id; Name: Präfix > Teilstring > Teilfolge; sonst Dex-Reihenfolge

// encounters.ts (mutieren den übergebenen Run; im UI nur über mutate() aufrufen)
// Lesende Helfer nehmen Encounters, im UI app.encounters (Run oder Originaldaten)
findSightings(encounters: Encounters, speciesId: number): Sighting[]
addEncounter(run: Run, locationId: string, method: EncounterMethod, speciesId: number): void
removeEncounter(run: Run, locationId: string, method: EncounterMethod, speciesId: number): void
  // räumt leere Arrays/Objekte weg
addCustomLocation(run: Run, name: string): Location          // id "custom-<uuid>", methods []
removeCustomLocation(run: Run, locationId: string): void      // löscht auch encounters[id]
isCustomLocation(id: string): boolean
countSpecies(encounters: Encounters, locationId: string): number          // verschiedene Species über alle Methoden
allLocations(gameLocations: Location[], run: Run): Location[] // Spielorte + eigene (hinten)
methodsFor(location: Location, encounters: Encounters): EncounterMethod[]   // location.methods ∪ benutzte

// entry.ts
applyPatch<T>(target: T, patch: Partial<T>): void  // undefined löscht Feld
patchEntry(pokemon: Run["pokemon"], speciesId: number, patch: Partial<PokemonEntry>): void  // leere Einträge fallen weg

// runs.svelte.ts – Runes-State; Funktionen fangen Fehler selbst ab (toast.error), werfen nie
const app: {
  runs: RunSummary[]; current: Run | null /* deep $state */; data: GameData | null /* $state.raw */;
  original: Original | null /* $state.raw, nur bei run.randomized === false */;
  loading: boolean; readonly activeCategories: Category[] /* enabled ∩ categoriesForGeneration; ohne Randomizer alle */;
  readonly encounters: Encounters /* original.speciesEncounters ?? current.encounters */;
  view: View; selectedSpeciesId: number | null; selectedLocationId: string | null }
interface RunInput { name: string; gameId: string; seed?: string; note?: string;
  enabledCategories: Category[]; wildMatching?: WildMatching; randomized?: false }
initRuns(): Promise<void>                // list_runs, öffnet zuletzt benutzten (localStorage "randex.lastRunId")
openRun(id: string): Promise<void>       // flushSave, load_run, loadGameData (+ loadOriginal ohne Randomizer), Auswahl zurücksetzen
createRun(input: RunInput): Promise<Run | null>   // speichert sofort und öffnet
updateRunMeta(input: RunInput): Promise<boolean>  // optionale Felder mit undefined werden entfernt; lädt GameData/Original passend zu Spiel und Randomizer-Schalter
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

| Datei | Props |
| --- | --- |
| `src/routes/+page.svelte` | – (rendert `AppShell`, ruft `initRuns()`) |
| `AppShell.svelte` | – Kopfzeile, Run-Wechsler, Export/Import/Löschen, Ansicht Pokémon ⇄ Routen ⇄ Fortschritt, Hell/Dunkel (`mode-watcher`), Leerzustand ohne Run |
| `RunDialog.svelte` | `open: boolean` (bindable), `run?: Run` (fehlt = Anlegen) – Name, Spiel (nach Gen gruppiert), Seed, Schalter „Randomizer-Run“, Notiz; nur mit Randomizer: Wilde Pokémon, Kategorie-Toggles (nur `categoriesForGeneration`) |
| `list/PokemonList.svelte` | – Suche, Filter (nur mit Randomizer), Typfilter (Run- oder Originaltypen), ↑↓, Tippen fokussiert Suche (nur ohne Fokus in Eingabefeld/Dialog), Dex-Wahl über `list/DexSelect` (`Run.dexId`, Standard ohne Randomizer: erster Regional-Dex; `app.dex`/`app.dexSpecies`/`app.dexNumber`) |
| `list/TypeBadge.svelte` | `id: TypeId`, `size?: "sm" \| "md"`, `class?` |
| `list/Sprite.svelte` | `id: number`, `size?: number` (px, Standard 40), `class?` – lazy, feste Größe, Platzhalter bei Fehler |
| `list/SpeciesPicker.svelte` | `value?: number \| string \| null`, `onSelect: (v: number \| string) => void`, `allowFreeText?: boolean`, `exclude?: number[]`, `placeholder?: string` – Popover + Command über `app.data.species` |
| `PokemonDetail.svelte`, `detail/*` | – Editoren je `app.activeCategories`, ohne Randomizer stattdessen `detail/OriginalSection` (schreibgeschützt); Fundorte = `findSightings(app.encounters)`, Klick → `showLocation` |
| `detail/NamePicker.svelte` | `items: { name: string }[]`, `value: string`, `onSelect: (name: string) => void` – Autocomplete Attacken/Fähigkeiten, Freitext |
| `encounter/EncounterView.svelte`, `encounter/*` | – Ortsliste (Suche, `app.selectedLocationId`), Editor pro Methode, `SpeciesPicker` (`allowFreeText=false`), Methode hinzufügen, eigene Orte anlegen/löschen; ohne Randomizer schreibgeschützt mit Level aus `app.original`; Klick auf Pokémon → `showSpecies` |
| `encounter/RegionMap.svelte` | – schematische Regionskarte (`loadRegionMap`), Klick auf Ort → Encounter-Liste |
| `ProgressView.svelte` | – Team (bis 6), Orden (`loadBadges`) und Feldfähigkeiten (`loadFieldMoves`) zum Abhaken |
| `PokedexView.svelte` | – Pokédex des gewählten Dex zum Abhaken (`Run.caught`, `toggleCaught`), Fortschritt, Suche, Filter Gefangen/Fehlend |
| `SaveView.svelte` | – nur mit `run.saveGame`: Spielstand laden (`importSave`), Unter-Tabs Team/Boxen/Beutel aus `run.save` (`loadSavegameData`) |

## UI-Bausteine (`src/lib/components/kit/`)

Dünne App-Schicht über shadcn (`ui/`), Import über `$lib/components/kit`. Alle nehmen `children: Snippet`
(außer `StatBar`, `SwitchField`); `class` nur für Layout.

| Datei | Props |
| --- | --- |
| `Panel.svelte` | `title?`, `header?: Snippet` (ersetzt Titel), `actions?: Snippet` (rechts, Zähler/Knöpfe), `footer?: Snippet`, `flush?` (Body ohne `p-3`), `class?`, `bodyClass?` – ohne `title`/`header` kein Kopf |
| `IconButton.svelte` | `label` (aria-label + title), `variant?` (Standard `ghost`), `size?: "icon" \| "icon-sm" \| "icon-xs"`, `onHeader?`, `class?`, Rest = Button-Attribute (`onclick`, `disabled` …) |
| `EditRow.svelte` | `onRemove?` + `removeLabel` (zusammen), `inset?` (Kachel-Optik), `class?` (Inhalt, z. B. Grid) – `<li>` in `<ul class="flex flex-col gap-2">`; ohne `onRemove` Platzhalter-Spalte |
| `Chip.svelte` | `onclick?` (Inhalt wird Button), `onRemove?` + `removeLabel`, `class?` – Liste `<ul class="flex flex-wrap gap-1.5">` |
| `SelectCard.svelte` | `pressed`, `onclick`, `label?` (aria-label), `class?` – `aria-pressed`, Check-Badge wenn an |
| `NavRow.svelte` | `onclick`, `meta?: Snippet` (rechts), `current?` (aria-current), `class?` – Liste `<ul class="flex flex-col gap-1">` |
| `Section.svelte` | `title`, `aside?: Snippet` (hinter Titel), `collapsible?` (Karte, Kopfzeile klappt ein, anfangs offen), `class?` |
| `EmptyState.svelte` | `variant?: "block" \| "inline" \| "center"` (Standard `block`), `status?` (role=status), `class?` |
| `Hint.svelte` | `live?` (aria-live polite), `class?` |
| `Field.svelte` | `label`, `for` (id des Controls), `optional?`, `hint?` |
| `SwitchField.svelte` | `id`, `label`, `checked` (bindable), `hint?`, `disabled?` |
| `StatBar.svelte` | `value`, `max`, `class` (Füllfarbe, `STATS[i].bar`) |
| `TabTrigger.svelte` | wie `Tabs.Trigger` (`value`, `children` …) – aktiv `bg-primary` |
| `SegmentItem.svelte` | wie `ToggleGroup.Item` (`value`, `children` …) – an `bg-primary`; Root `variant="outline" size="sm"` |
