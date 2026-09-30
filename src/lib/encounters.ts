import { ENCOUNTER_METHODS } from "./types.ts";
import type { EncounterMethod, Location, Run, Sighting } from "./types.ts";

export function findSightings(run: Run, speciesId: number): Sighting[] {
  const out: Sighting[] = [];
  for (const [locationId, byMethod] of Object.entries(run.encounters)) {
    for (const method of ENCOUNTER_METHODS) {
      if (byMethod[method]?.includes(speciesId)) out.push({ locationId, method });
    }
  }
  return out;
}

export function addEncounter(run: Run, locId: string, method: EncounterMethod, speciesId: number): void {
  // Nach ??= neu lesen: erst der Lesezugriff liefert den $state-Proxy.
  run.encounters[locId] ??= {};
  const byMethod = run.encounters[locId];
  byMethod[method] ??= [];
  const list = byMethod[method];
  if (!list.includes(speciesId)) list.push(speciesId);
}

export function removeEncounter(run: Run, locId: string, method: EncounterMethod, speciesId: number): void {
  const byMethod = run.encounters[locId];
  const list = byMethod?.[method];
  if (!byMethod || !list) return;
  const rest = list.filter((id) => id !== speciesId);
  if (rest.length) byMethod[method] = rest;
  else delete byMethod[method];
  if (Object.keys(byMethod).length === 0) delete run.encounters[locId];
}

export const isCustomLocation = (id: string) => id.startsWith("custom-");

export const countSpecies = (run: Run, locId: string) => new Set(Object.values(run.encounters[locId] ?? {}).flat()).size;

export function addCustomLocation(run: Run, name: string): Location {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Ortsname fehlt");
  const loc: Location = { id: `custom-${crypto.randomUUID()}`, name: trimmed, methods: [] };
  run.customLocations.push(loc);
  return loc;
}

export function removeCustomLocation(run: Run, id: string): void {
  run.customLocations = run.customLocations.filter((l) => l.id !== id);
  delete run.encounters[id];
}

export function allLocations(gameLocations: readonly Location[], run: Run): Location[] {
  return [...gameLocations, ...run.customLocations];
}

/** Methoden des Ortes plus im Run zusätzlich benutzte (in Standardreihenfolge). */
export function methodsFor(location: Location, run: Run): EncounterMethod[] {
  const used = run.encounters[location.id] ?? {};
  const extra = ENCOUNTER_METHODS.filter((m) => used[m] && !location.methods.includes(m));
  return [...location.methods, ...extra];
}
