import type { PocketId, SavegameData, SaveMon, Stats } from "./types.ts";

export const POCKET_LABELS: Record<PocketId, string> = {
  items: "Items",
  medicine: "Medizin",
  balls: "Bälle",
  tms: "TM/VM",
  berries: "Beeren",
  keyItems: "Basis-Items",
  pc: "PC",
};

/** Level aus EXP; Boxen speichern kein Level. */
export function levelOf(mon: SaveMon, data: SavegameData): number {
  if (mon.level) return mon.level;
  const curve = data.experience[(data.growth[mon.speciesId] ?? 2) - 1] ?? [];
  const next = curve.findIndex((exp) => exp > mon.exp);
  return next === -1 ? curve.length : next;
}

/** Wesen n: +NATURE_STATS[n / 5], −NATURE_STATS[n % 5] (gleich = neutral) */
const NATURE_STATS: (keyof Stats)[] = ["atk", "def", "spe", "spa", "spd"];

export function natureEffect(nature: number): { up?: keyof Stats; down?: keyof Stats } {
  const up = NATURE_STATS[Math.floor(nature / 5)];
  const down = NATURE_STATS[nature % 5];
  return up === down ? {} : { up, down };
}

const SHEDINJA = 292;

/** Werte ab Gen 3 aus Basiswerten, IVs, EVs, Wesen und Level (Boxen speichern keine Werte). */
export function calcStats(base: Stats, mon: SaveMon, level: number): Stats {
  const { up, down } = natureEffect(mon.nature);
  const core = (k: keyof Stats) => Math.floor(((2 * base[k] + mon.ivs[k] + Math.floor(mon.evs[k] / 4)) * level) / 100);
  const stat = (k: keyof Stats) => Math.floor(((core(k) + 5) * (k === up ? 110 : k === down ? 90 : 100)) / 100);
  return {
    hp: mon.speciesId === SHEDINJA ? 1 : core("hp") + level + 10,
    atk: stat("atk"),
    def: stat("def"),
    spa: stat("spa"),
    spd: stat("spd"),
    spe: stat("spe"),
  };
}

export const itemName = (data: SavegameData, generation: number, item: number): string =>
  data.items[generation]?.[item] ?? `Item #${item}`;

export function itemIcon(data: SavegameData, generation: number, item: number): string | undefined {
  const file = data.icons[generation]?.[item];
  return file && `/items/${file}.png`;
}

/** Spitzname, wenn er sich vom Artnamen unterscheidet (Gen 3 speichert sonst den Artnamen in Großbuchstaben). */
export function ownNickname(mon: SaveMon, speciesName: string | undefined): string | undefined {
  const nick = mon.nickname;
  return nick && nick.toLocaleUpperCase("de") !== speciesName?.toLocaleUpperCase("de") ? nick : undefined;
}
