import type { Run, Species, TypeId } from "./types.ts";

export type EntryFilter = "all" | "entered" | "missing";

export interface SearchOptions {
  query: string;
  filter: EntryFilter;
  type: TypeId | null;
}

/** Kleinschreibung ohne Diakritika. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Existenz genügt, da patchEntry leere Einträge entfernt. */
export function hasEntry(run: Run, speciesId: number): boolean {
  return run.pokemon[speciesId] !== undefined;
}

function isSubsequence(name: string, q: string): boolean {
  let i = 0;
  for (let j = 0; j < name.length && i < q.length; j++) if (name[j] === q[i]) i++;
  return i === q.length;
}

// Schlüssel = Artenliste aus GameData ($state.raw, daher kein Proxy).
const nameIndex = new WeakMap<readonly Species[], string[]>();

function namesOf(species: readonly Species[]): string[] {
  let names = nameIndex.get(species);
  if (!names) {
    names = species.map((s) => normalize(s.name));
    nameIndex.set(species, names);
  }
  return names;
}

export function searchSpecies(species: readonly Species[], run: Run | null, opts: SearchOptions): Species[] {
  const names = namesOf(species);
  const q = normalize(opts.query);
  const num = /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : null;
  const tiers: Species[][] = [[], [], []];

  for (let i = 0; i < species.length; i++) {
    const s = species[i];
    if (run) {
      if (opts.filter !== "all" && hasEntry(run, s.id) !== (opts.filter === "entered")) continue;
      if (opts.type && !run.pokemon[s.id]?.types?.includes(opts.type)) continue;
    } else if (opts.type || opts.filter === "entered") continue;

    let tier = 0;
    if (num !== null) {
      if (s.id !== num) continue;
    } else if (q) {
      const n = names[i];
      tier = n.startsWith(q) ? 0 : n.includes(q) ? 1 : isSubsequence(n, q) ? 2 : -1;
      if (tier < 0) continue;
    }
    tiers[tier].push(s);
  }
  return tiers.flat();
}
