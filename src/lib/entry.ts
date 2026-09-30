import type { PokemonEntry, Run } from "./types.ts";

/** Übernimmt gesetzte Felder, entfernt Felder mit undefined. */
export function applyPatch<T extends object>(target: T, patch: Partial<T>): void {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete (target as Record<string, unknown>)[k];
    else (target as Record<string, unknown>)[k] = v;
  }
}

/** Leere Einträge werden entfernt; hasEntry verlässt sich darauf. */
export function patchEntry(pokemon: Run["pokemon"], speciesId: number, patch: Partial<PokemonEntry>): void {
  const entry: PokemonEntry = pokemon[speciesId] ?? {};
  applyPatch(entry, patch);
  if (Object.keys(entry).length) pokemon[speciesId] = entry;
  else delete pokemon[speciesId];
}
