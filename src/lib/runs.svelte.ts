import { invoke } from "@tauri-apps/api/core";
import { toast } from "svelte-sonner";
import {
  categoriesForGeneration, loadBadges, loadFieldMoves, loadGameData, loadGames, loadOriginal, loadSavegameData, type GameData,
  type Original,
} from "./data.ts";
import { applyPatch, patchEntry } from "./entry.ts";
import { fieldMovesInBag, ownNickname } from "./savegame.ts";
import { SCHEMA_VERSION } from "./types.ts";
import type {
  Category, Encounters, Game, Pokedex, PokemonEntry, Run, RunSummary, SaveSnapshot, Species, View, WildMatching,
} from "./types.ts";

export interface RunInput {
  name: string;
  gameId: string;
  seed?: string;
  note?: string;
  enabledCategories: Category[];
  wildMatching?: WildMatching;
  randomized?: false;
  saveGame?: true;
}

const LAST_RUN_KEY = "randex.lastRunId";
const SAVE_DELAY_MS = 500;
export const DEFAULT_CATEGORIES: Category[] = ["types", "moves", "note"];

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function rememberRun(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_RUN_KEY, id);
    else localStorage.removeItem(LAST_RUN_KEY);
  } catch {
    // localStorage nicht verfügbar, nur Komfort
  }
}

function lastRunId(): string | null {
  try {
    return localStorage.getItem(LAST_RUN_KEY);
  } catch {
    return null;
  }
}

class App {
  runs = $state<RunSummary[]>([]);
  games = $state.raw<Game[]>([]);
  current = $state<Run | null>(null);
  data = $state.raw<GameData | null>(null);
  /** Nur bei Runs ohne Randomizer gesetzt. */
  original = $state.raw<Original | null>(null);
  loading = $state(false);
  view = $state<View>("pokemon");
  selectedSpeciesId = $state<number | null>(null);
  selectedLocationId = $state<string | null>(null);
  readonly activeCategories: Category[] = $derived.by(() => {
    const { current, data } = this;
    if (!current || !data) return [];
    const all = categoriesForGeneration(data.game.generation);
    return this.original ? all : all.filter((c) => current.enabledCategories.includes(c));
  });
  /** Gewählter Pokédex, null = National. Gespeicherter Dex aus einem anderen Spiel gilt als Standard. */
  readonly dex: Pokedex | null = $derived.by(() => {
    const dexes = this.data?.dexes ?? [];
    const id = this.current?.dexId;
    if (id === "national") return null;
    return dexes.find((d) => d.id === id) ?? (this.original ? (dexes[0] ?? null) : null);
  });
  /** Arten des Dex in Dex-Reihenfolge; ohne Randomizer nur Arten mit Originaldaten. Stabil für den Namensindex. */
  readonly dexSpecies: Species[] = $derived.by(() => {
    const { data, original, dex } = this;
    if (!data) return [];
    const list = dex ? dex.species.flatMap((id) => data.speciesById.get(id) ?? []) : data.species;
    return original ? list.filter((s) => original.pokemon[s.id]) : list;
  });
  /** Nummer im gewählten Dex (Regional-Nr.), sonst National-Nr. */
  readonly dexNumber = $derived.by(() => {
    const map = this.dex && new Map(this.dex.species.map((id, i) => [id, i + 1]));
    return (id: number) => map?.get(id) ?? id;
  });
  /** Ohne Randomizer die Original-Fundorte, sonst die eingetragenen. */
  readonly encounters: Encounters = $derived(this.original?.speciesEncounters ?? this.current?.encounters ?? {});
}

export const app = new App();

// Interner Speicherzustand, nicht reaktiv.
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let chain: Promise<void> = Promise.resolve();
let hooked = false;

function listRun(run: Run): void {
  const summary = { id: run.id, name: run.name, gameId: run.gameId, updatedAt: run.updatedAt };
  app.runs = [summary, ...app.runs.filter((r) => r.id !== run.id)].sort((a, b) => b.updatedAt - a.updatedAt);
}

function persist(): Promise<void> {
  chain = chain.then(async () => {
    if (!dirty || !app.current) return;
    dirty = false;
    const run = $state.snapshot(app.current) as Run;
    try {
      await invoke("save_run", { run });
      listRun(run);
    } catch (e) {
      // Kein Auto-Retry (Toast-Flut); nächste Änderung oder Fenster-Verstecken speichert erneut.
      dirty = true;
      toast.error(`Speichern fehlgeschlagen: ${errText(e)}`);
    }
  });
  return chain;
}

export async function flushSave(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  await persist();
}

/** Einzige Schreibstelle für den aktuellen Run. */
export function mutate(fn: (run: Run) => void): void {
  const run = app.current;
  if (!run) return;
  try {
    fn(run);
  } catch (e) {
    toast.error(errText(e));
  }
  // Auch nach Fehler speichern: fn kann den Run schon teilweise geändert haben.
  run.updatedAt = Date.now();
  scheduleSave();
}

function cancelSave(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  dirty = false;
}

function scheduleSave(): void {
  dirty = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
}

async function loadRunData(run: { gameId: string; randomized?: false }) {
  const [data, original] = await Promise.all([
    loadGameData(run.gameId),
    run.randomized === false ? loadOriginal(run.gameId) : null,
  ]);
  return { data, original };
}

function resetSelection(): void {
  app.selectedSpeciesId = null;
  app.selectedLocationId = null;
  app.view = "pokemon";
}

export async function openRun(id: string): Promise<void> {
  // Sonst lädt load_run den alten Stand und verwirft ungespeicherte Änderungen.
  if (id === app.current?.id) return;
  app.loading = true;
  try {
    const run = await invoke<Run>("load_run", { id });
    const { data, original } = await loadRunData(run);
    // Erst direkt vor dem Wechsel speichern, sonst gehen Änderungen während des Ladens verloren.
    await flushSave();
    app.current = run;
    app.data = data;
    app.original = original;
    resetSelection();
    rememberRun(id);
  } catch (e) {
    toast.error(`Run konnte nicht geöffnet werden: ${errText(e)}`);
  } finally {
    app.loading = false;
  }
}

export async function initRuns(): Promise<void> {
  if (!hooked) {
    hooked = true;
    window.addEventListener("beforeunload", () => void flushSave());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flushSave();
    });
  }
  loadGames()
    .then((g) => (app.games = g))
    .catch((e: unknown) => toast.error(`Spieleliste konnte nicht geladen werden: ${errText(e)}`));
  try {
    app.runs = await invoke<RunSummary[]>("list_runs");
  } catch (e) {
    toast.error(`Runs konnten nicht geladen werden: ${errText(e)}`);
    return;
  }
  const last = lastRunId();
  if (last && app.runs.some((r) => r.id === last)) await openRun(last);
}

export async function createRun(input: RunInput): Promise<Run | null> {
  app.loading = true;
  try {
    const { data, original } = await loadRunData(input);
    const now = Date.now();
    const run: Run = {
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      name: input.name,
      gameId: input.gameId,
      enabledCategories: input.enabledCategories,
      pokemon: {},
      encounters: {},
      customLocations: [],
      createdAt: now,
      updatedAt: now,
    };
    if (input.seed) run.seed = input.seed;
    if (input.note) run.note = input.note;
    if (input.wildMatching) run.wildMatching = input.wildMatching;
    if (input.randomized === false) run.randomized = false;
    if (input.saveGame) run.saveGame = true;
    await invoke("save_run", { run });
    await flushSave();
    app.current = run;
    app.data = data;
    app.original = original;
    resetSelection();
    rememberRun(run.id);
    listRun(run);
    return run;
  } catch (e) {
    toast.error(`Run konnte nicht angelegt werden: ${errText(e)}`);
    return null;
  } finally {
    app.loading = false;
  }
}

/** Optionale Felder mit undefined werden entfernt. */
export async function updateRunMeta(input: RunInput): Promise<boolean> {
  const run = app.current;
  if (!run) return false;
  try {
    // Gecacht: lädt nur nach, wenn Spiel oder Randomizer-Einstellung wechselt.
    const { data, original } = await loadRunData(input);
    if (app.current?.id !== run.id) return false;
    app.data = data;
    app.original = original;
    mutate((r) => applyPatch(r, input));
    if (!input.saveGame && app.view === "save") app.view = "progress";
    return true;
  } catch (e) {
    toast.error(`Run konnte nicht geändert werden: ${errText(e)}`);
    return false;
  }
}

export async function deleteRun(id: string): Promise<void> {
  const isCurrent = app.current?.id === id;
  const wasDirty = isCurrent && dirty;
  if (isCurrent) {
    // Kein Speichern mehr, das die gelöschte Datei wieder anlegt.
    cancelSave();
    await chain;
  }
  try {
    await invoke("delete_run", { id });
  } catch (e) {
    if (wasDirty && app.current?.id === id) scheduleSave();
    toast.error(`Run konnte nicht gelöscht werden: ${errText(e)}`);
    return;
  }
  app.runs = app.runs.filter((r) => r.id !== id);
  if (app.current?.id === id) {
    cancelSave();
    app.current = null;
    app.data = null;
    app.original = null;
    resetSelection();
    rememberRun(null);
    if (app.runs[0]) await openRun(app.runs[0].id);
  }
}

export function setDex(id: string): void {
  mutate((r) => {
    r.dexId = id;
  });
}

export function toggleCaught(speciesId: number): void {
  mutate((r) => {
    const set = new Set(r.caught ?? []);
    if (!set.delete(speciesId)) set.add(speciesId);
    r.caught = [...set];
  });
}

export function updateEntry(speciesId: number, patch: Partial<PokemonEntry>): void {
  mutate((r) => patchEntry(r.pokemon, speciesId, patch));
}

export function showLocation(locId: string): void {
  app.selectedLocationId = locId;
  app.view = "routes";
}

export function showSpecies(id: number): void {
  app.selectedSpeciesId = id;
  app.view = "pokemon";
}

export async function exportCurrentRun(): Promise<void> {
  if (!app.current) return;
  try {
    await flushSave();
    if (await invoke<boolean>("export_run", { run: $state.snapshot(app.current) })) toast.success("Run exportiert");
  } catch (e) {
    toast.error(`Export fehlgeschlagen: ${errText(e)}`);
  }
}

export async function importRunFromFile(): Promise<void> {
  try {
    const run = await invoke<Run | null>("import_run");
    if (!run) return;
    // Unbekanntes Spiel vor dem Speichern ablehnen.
    await loadRunData(run);
    // Neue ID: keine Kollision, keine fremden Dateinamen.
    run.id = crypto.randomUUID();
    await invoke("save_run", { run });
    listRun(run);
    await openRun(run.id);
  } catch (e) {
    toast.error(`Import fehlgeschlagen: ${errText(e)}`);
  }
}

/**
 * Spielstand per Dateidialog einlesen: Team, Orden, gefangene Pokémon und Feldfähigkeiten (VM im Beutel) übernehmen,
 * Team/Boxen/Beutel ablegen. Gefangene und Feldfähigkeiten werden ergänzt, nie entfernt (manuell Abgehaktes bleibt).
 */
export async function importSave(): Promise<void> {
  const run = app.current;
  const generation = app.data?.game.generation;
  if (!run || !generation) return;
  try {
    type Read = Omit<SaveSnapshot, "readAt"> & {
      badges: number;
      knownBadges: number;
      caught: number[];
      caughtDex?: number[][];
    };
    const save = await invoke<Read | null>("read_save", { gameId: run.gameId });
    if (!save) return;
    const [badges, fieldMoves, saveData] = await Promise.all([
      loadBadges(run.gameId),
      loadFieldMoves(run.gameId),
      loadSavegameData(),
    ]);
    if (app.current?.id !== run.id) return;
    const { badges: owned, knownBadges, caught: national, caughtDex, ...snapshot } = save;
    // Schwert/Schild: Regionaldex-Nummern je Dex (Galar, Rüstungsinsel, Kronen-Schneelande) → Arten
    const dexes = app.data?.dexes ?? [];
    const caught = [
      ...national,
      ...(caughtDex ?? []).flatMap((nums, d) => nums.flatMap((n) => dexes[d]?.species[n - 1] ?? [])),
    ];
    mutate((r) => {
      r.team = save.team.map((m) => {
        const nickname = ownNickname(m, app.data?.speciesById.get(m.speciesId)?.name);
        return nickname ? { speciesId: m.speciesId, nickname, level: m.level } : { speciesId: m.speciesId, level: m.level };
      });
      // Nur Orden, die der Spielstand kennt, übernehmen; die übrigen (z. B. Prüfungen in Gen 7) bleiben wie abgehakt
      const had = new Set(r.badges ?? []);
      r.badges = badges
        .filter((b, i) => (knownBadges & (1 << i) ? owned & (1 << i) : had.has(b.id)))
        .map((b) => b.id);
      r.caught = [...new Set([...(r.caught ?? []), ...caught])];
      r.fieldMoves = [...new Set([...(r.fieldMoves ?? []), ...fieldMovesInBag(fieldMoves, snapshot.bag, saveData, generation)])];
      r.save = { ...snapshot, readAt: Date.now() };
    });
    toast.success(`Spielstand eingelesen, ${caught.length} Pokémon im Pokédex gefangen`);
  } catch (e) {
    toast.error(`Spielstand konnte nicht gelesen werden: ${errText(e)}`);
  }
}

export async function openWiki(title: string): Promise<void> {
  try {
    await invoke("open_wiki", { title });
  } catch (e) {
    toast.error(errText(e));
  }
}
