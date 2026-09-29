import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { toast } from "svelte-sonner";
import { categoriesForGeneration, loadGameData, loadGames, type GameData } from "./data.ts";
import { SCHEMA_VERSION } from "./types.ts";
import type { Category, Game, PokemonEntry, Run, RunSummary, View, WildMatching } from "./types.ts";

export interface RunInput {
  name: string;
  gameId: string;
  seed?: string;
  note?: string;
  enabledCategories: Category[];
  wildMatching?: WildMatching;
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
    // localStorage nicht verfügbar: nur Komfortfunktion
  }
}

function lastRunId(): string | null {
  try {
    return localStorage.getItem(LAST_RUN_KEY);
  } catch {
    return null;
  }
}

/** Setzt gesetzte Felder, entfernt Felder mit undefined. */
function applyPatch<T extends object>(target: T, patch: Partial<T>): void {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete (target as Record<string, unknown>)[k];
    else (target as Record<string, unknown>)[k] = v;
  }
}

class App {
  runs = $state<RunSummary[]>([]);
  games = $state.raw<Game[]>([]);
  current = $state<Run | null>(null);
  data = $state.raw<GameData | null>(null);
  loading = $state(false);
  view = $state<View>("pokemon");
  selectedSpeciesId = $state<number | null>(null);
  selectedLocationId = $state<string | null>(null);
  readonly activeCategories: Category[] = $derived.by(() => {
    if (!this.current || !this.data) return [];
    const allowed = categoriesForGeneration(this.data.game.generation);
    return allowed.filter((c) => this.current?.enabledCategories.includes(c));
  });
}

export const app = new App();

// Interner Speicherzustand, nicht reaktiv.
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let chain: Promise<void> = Promise.resolve();
let hooked = false;

async function refreshList(): Promise<void> {
  app.runs = await invoke<RunSummary[]>("list_runs");
}

function persist(): Promise<void> {
  chain = chain.then(async () => {
    if (!dirty || !app.current) return;
    dirty = false;
    const run = $state.snapshot(app.current) as Run;
    try {
      await invoke("save_run", { run });
      const summary = { id: run.id, name: run.name, gameId: run.gameId, updatedAt: run.updatedAt };
      const rest = app.runs.filter((r) => r.id !== run.id);
      app.runs = [summary, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (e) {
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
  if (!app.current) return;
  try {
    fn(app.current);
  } catch (e) {
    toast.error(errText(e));
    return;
  }
  app.current.updatedAt = Date.now();
  dirty = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
}

function resetSelection(): void {
  app.selectedSpeciesId = null;
  app.selectedLocationId = null;
  app.view = "pokemon";
}

export async function openRun(id: string): Promise<void> {
  app.loading = true;
  try {
    await flushSave();
    const run = await invoke<Run>("load_run", { id });
    const data = await loadGameData(run.gameId);
    app.current = run;
    app.data = data;
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
    await refreshList();
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
    await flushSave();
    const data = await loadGameData(input.gameId);
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
    await invoke("save_run", { run });
    app.current = run;
    app.data = data;
    dirty = false;
    resetSelection();
    rememberRun(run.id);
    await refreshList();
    return app.current;
  } catch (e) {
    toast.error(`Run konnte nicht angelegt werden: ${errText(e)}`);
    return null;
  } finally {
    app.loading = false;
  }
}

export async function updateRunMeta(patch: Partial<RunInput>): Promise<void> {
  if (!app.current) return;
  try {
    if (patch.gameId && patch.gameId !== app.current.gameId) {
      app.data = await loadGameData(patch.gameId);
    }
    mutate((r) => applyPatch(r, patch));
  } catch (e) {
    toast.error(`Run konnte nicht geändert werden: ${errText(e)}`);
  }
}

export async function deleteRun(id: string): Promise<void> {
  try {
    if (app.current?.id === id) {
      if (timer) clearTimeout(timer);
      timer = null;
      dirty = false;
      await chain;
    }
    await invoke("delete_run", { id });
    await refreshList();
    if (app.current?.id === id) {
      app.current = null;
      app.data = null;
      resetSelection();
      rememberRun(null);
      if (app.runs[0]) await openRun(app.runs[0].id);
    }
  } catch (e) {
    toast.error(`Run konnte nicht gelöscht werden: ${errText(e)}`);
  }
}

export function updateEntry(speciesId: number, patch: Partial<PokemonEntry>): void {
  mutate((r) => {
    const entry: PokemonEntry = r.pokemon[speciesId] ?? {};
    applyPatch(entry, patch);
    if (Object.keys(entry).length) r.pokemon[speciesId] = entry;
    else delete r.pokemon[speciesId];
  });
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
    const path = await save({
      defaultPath: `${app.current.name}.json`,
      filters: [{ name: "Randex-Run", extensions: ["json"] }],
    });
    if (!path) return;
    await invoke("export_run", { run: $state.snapshot(app.current), path });
    toast.success("Run exportiert");
  } catch (e) {
    toast.error(`Export fehlgeschlagen: ${errText(e)}`);
  }
}

export async function importRunFromFile(): Promise<void> {
  try {
    const path = await open({ multiple: false, filters: [{ name: "Randex-Run", extensions: ["json"] }] });
    if (!path) return;
    await flushSave();
    const run = await invoke<Run>("import_run", { path });
    await loadGameData(run.gameId);
    // Immer neue ID: keine Kollision, keine fremden (z. B. unter Windows reservierten) Dateinamen.
    run.id = crypto.randomUUID();
    await invoke("save_run", { run });
    await refreshList();
    await openRun(run.id);
  } catch (e) {
    toast.error(`Import fehlgeschlagen: ${errText(e)}`);
  }
}
