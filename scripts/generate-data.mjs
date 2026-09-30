// Erzeugt static/data/** und static/sprites/** aus dem PokeAPI-CSV-Dump.
// Aufruf: npm run generate (idempotent: vorhandene Sprites werden übersprungen)
import { mkdir, writeFile, access, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "static/data");
const SPRITES = path.join(ROOT, "static/sprites");
const CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const DE = 6;
const EN = 9;
const MAX_SPECIES = 1025;

const TYPE_ORDER = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const TYPE_GEN = { dark: 2, steel: 2, fairy: 6 };

// Hauptreihe ohne Colosseum/XD, DLCs, Japan-Editionen, Legenden Z-A. [Version-Slug, Name, Region]
const GAMES = [
  ["red", "Rote Edition", "Kanto"], ["blue", "Blaue Edition", "Kanto"], ["yellow", "Gelbe Edition", "Kanto"],
  ["gold", "Goldene Edition", "Johto"], ["silver", "Silberne Edition", "Johto"], ["crystal", "Kristall-Edition", "Johto"],
  ["ruby", "Rubin-Edition", "Hoenn"], ["sapphire", "Saphir-Edition", "Hoenn"], ["emerald", "Smaragd-Edition", "Hoenn"],
  ["firered", "Feuerrote Edition", "Kanto"], ["leafgreen", "Blattgrüne Edition", "Kanto"],
  ["diamond", "Diamant-Edition", "Sinnoh"], ["pearl", "Perl-Edition", "Sinnoh"], ["platinum", "Platin-Edition", "Sinnoh"],
  ["heartgold", "HeartGold-Edition", "Johto"], ["soulsilver", "SoulSilver-Edition", "Johto"],
  ["black", "Schwarze Edition", "Einall"], ["white", "Weiße Edition", "Einall"],
  ["black-2", "Schwarze Edition 2", "Einall"], ["white-2", "Weiße Edition 2", "Einall"],
  ["x", "X", "Kalos"], ["y", "Y", "Kalos"],
  ["omega-ruby", "Omega Rubin", "Hoenn"], ["alpha-sapphire", "Alpha Saphir", "Hoenn"],
  ["sun", "Sonne", "Alola"], ["moon", "Mond", "Alola"],
  ["ultra-sun", "Ultrasonne", "Alola"], ["ultra-moon", "Ultramond", "Alola"],
  ["lets-go-pikachu", "Let's Go, Pikachu!", "Kanto"], ["lets-go-eevee", "Let's Go, Evoli!", "Kanto"],
  ["sword", "Schwert", "Galar"], ["shield", "Schild", "Galar"],
  ["brilliant-diamond", "Strahlender Diamant", "Sinnoh"], ["shining-pearl", "Leuchtende Perle", "Sinnoh"],
  ["legends-arceus", "Legenden: Arceus", "Hisui"],
  ["scarlet", "Karmesin", "Paldea"], ["violet", "Purpur", "Paldea"],
];
// Regionen, deren deutscher Name vom PokeAPI-Identifier abweicht
const REGION_SLUG = { Einall: "unova" };

// PokeAPI-Methode -> EncounterMethod (alles Unbekannte wird "other")
const METHOD_MAP = {
  walk: "walk", "yellow-flowers": "walk", "purple-flowers": "walk", "red-flowers": "walk", "rough-terrain": "walk",
  "dark-grass": "dark-grass", "grass-spots": "shaking", "cave-spots": "shaking", "bridge-spots": "shaking",
  surf: "surf", "surf-spots": "surf-spots",
  "old-rod": "old-rod", "good-rod": "good-rod", "super-rod": "super-rod", "super-rod-spots": "fishing-spots",
  "rock-smash": "rock-smash", headbutt: "headbutt", "headbutt-low": "headbutt", "headbutt-normal": "headbutt", "headbutt-high": "headbutt",
  gift: "gift", "gift-egg": "gift", static: "static",
};
const METHOD_ORDER = [
  "walk", "dark-grass", "shaking", "surf", "surf-spots", "old-rod", "good-rod", "super-rod",
  "fishing-spots", "rock-smash", "headbutt", "gift", "static", "other",
];

const SPECIAL = "\0special";

/** Map<Varianten-Schlüssel, Set<Species>> → Slots: Maximum über die Varianten, "" gilt in allen, SPECIAL zählt nie. */
export function slotCount(byVariant) {
  const always = byVariant.get("") ?? new Set();
  const variants = [...byVariant].filter(([k]) => k !== "" && k !== SPECIAL);
  if (!variants.length) return always.size;
  return Math.max(...variants.map(([, set]) => new Set([...always, ...set]).size));
}

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1 || r[0] !== "").map((r) => {
    if (r.length !== head.length) throw new Error(`CSV-Zeile mit ${r.length} statt ${head.length} Spalten: ${r.join(",")}`);
    return Object.fromEntries(head.map((h, i) => [h, r[i]]));
  });
}

async function fetchRetry(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

const csv = async (name) => parseCsv((await fetchRetry(`${CSV}${name}.csv`)).toString());

function names(rows, idKey) {
  const de = new Map(), en = new Map();
  for (const r of rows) {
    if (!r.name) continue;
    if (+r.local_language_id === DE) de.set(+r[idKey], r.name);
    else if (+r.local_language_id === EN) en.set(+r[idKey], r.name);
  }
  return (id) => de.get(id) ?? en.get(id);
}

/** "sinnoh-pokemart" -> "Sinnoh Pokemart" (Orte ohne Namen in der PokeAPI) */
const humanize = (slug) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/** Gleichnamige Orte unterscheidbar machen: "Maniac-Tunnel", "Maniac-Tunnel (2)" */
function numberDuplicates(list) {
  const seen = new Map();
  for (const l of list) {
    const n = (seen.get(l.name) ?? 0) + 1;
    seen.set(l.name, n);
    if (n > 1) l.name = `${l.name} (${n})`;
  }
}

const json = (file, data) => writeFile(file, JSON.stringify(data));
const byName = (a, b) => a.name.localeCompare(b.name, "de");

async function pool(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

async function sprites() {
  await mkdir(SPRITES, { recursive: true });
  const ids = Array.from({ length: MAX_SPECIES }, (_, i) => i + 1);
  let done = 0, skipped = 0;
  const missing = [];
  await pool(ids, 24, async (id) => {
    const file = path.join(SPRITES, `${id}.png`);
    if (await access(file).then(() => true, () => false)) { skipped++; return; }
    const urls = id <= 649 ? [`${SPRITE_BASE}versions/generation-v/black-white/${id}.png`, `${SPRITE_BASE}${id}.png`] : [`${SPRITE_BASE}${id}.png`];
    for (const url of urls) {
      const png = await fetchRetry(url);
      if (!png) continue;
      // über .tmp, sonst gilt eine abgebrochene Datei beim nächsten Lauf als vorhanden
      await writeFile(`${file}.tmp`, png);
      await rename(`${file}.tmp`, file);
      done++;
      return;
    }
    missing.push(id);
  });
  console.log(`Sprites: ${done} geladen, ${skipped} vorhanden, ${missing.length} fehlen ${missing.join(",")}`);
  if (missing.length) process.exitCode = 1;
}

async function main() {
  await mkdir(path.join(DATA, "locations"), { recursive: true });
  const [versions, versionGroups, speciesRows, speciesNames, moveRows, moveNames, abilityRows, abilityNames,
    typeRows, typeNames, regions, locations, locationNames, areas, encounters, slots, methods, pokemonRows,
    conditions, conditionValues, conditionMap] = await Promise.all([
    "versions", "version_groups", "pokemon_species", "pokemon_species_names", "moves", "move_names",
    "abilities", "ability_names", "types", "type_names", "regions", "locations", "location_names", "location_areas",
    "encounters", "encounter_slots", "encounter_methods", "pokemon",
    "encounter_conditions", "encounter_condition_values", "encounter_condition_value_map",
  ].map(csv));

  const groupGen = new Map(versionGroups.map((g) => [g.id, +g.generation_id]));
  const versionBySlug = new Map(versions.map((v) => [v.identifier, v]));
  const games = GAMES.map(([id, name, region]) => {
    const v = versionBySlug.get(id);
    if (!v) throw new Error(`Version fehlt in PokeAPI: ${id}`);
    return { id, name, generation: groupGen.get(v.version_group_id), region };
  });
  await json(path.join(DATA, "games.json"), games);

  const sName = names(speciesNames, "pokemon_species_id");
  const species = speciesRows.filter((r) => +r.id <= MAX_SPECIES)
    .map((r) => ({ id: +r.id, name: sName(+r.id) ?? r.identifier, generation: +r.generation_id }))
    .sort((a, b) => a.id - b.id);
  if (species.length !== MAX_SPECIES) throw new Error(`${species.length} statt ${MAX_SPECIES} Species`);
  await json(path.join(DATA, "species.json"), species);

  const mName = names(moveNames, "move_id");
  const moves = moveRows.filter((r) => +r.id < 10000)
    .map((r) => ({ id: +r.id, name: mName(+r.id) ?? r.identifier, generation: +r.generation_id })).sort(byName);
  await json(path.join(DATA, "moves.json"), moves);

  const aName = names(abilityNames, "ability_id");
  const abilities = abilityRows.filter((r) => +r.id < 10000 && r.is_main_series === "1")
    .map((r) => ({ id: +r.id, name: aName(+r.id) ?? r.identifier, generation: +r.generation_id })).sort(byName);
  await json(path.join(DATA, "abilities.json"), abilities);

  const tName = names(typeNames, "type_id");
  const typeBySlug = new Map(typeRows.map((r) => [r.identifier, r]));
  const types = TYPE_ORDER.map((id) => ({ id, name: tName(+typeBySlug.get(id).id) ?? id, generation: TYPE_GEN[id] ?? 1 }));
  await json(path.join(DATA, "types.json"), types);

  const regionId = new Map(regions.map((r) => [r.identifier, r.id]));
  const lName = names(locationNames, "location_id");
  const locById = new Map(locations.map((l) => [l.id, l]));
  const areaLoc = new Map(areas.map((a) => [a.id, a.location_id]));
  const methodOf = new Map(methods.map((m) => [m.id, METHOD_MAP[m.identifier] ?? "other"]));
  const slotMethod = new Map(slots.map((s) => [s.id, methodOf.get(s.encounter_method_id)]));
  const verSlug = new Map(versions.map((v) => [v.id, v.identifier]));
  const speciesOf = new Map(pokemonRows.map((p) => [p.id, p.species_id]));

  // Slots = verschiedene Species, die man im normalen Spielverlauf (vor der Liga) auf einmal sieht:
  // Sonderbedingungen (Radio, Schwarm, PokéRadar, GBA-Slot, Story nach der Liga …) zählen nicht,
  // Tages-/Jahreszeit und Wochentag sind Varianten → Maximum über die Varianten statt Summe.
  const conditionName = new Map(conditions.map((c) => [c.id, c.identifier]));
  const VARIANT = new Set(["time", "season", "weekday"]);
  const UNION = new Set(["headbutt-tree"]);
  const valueInfo = new Map(conditionValues.map((v) => [v.id, { name: v.identifier, cond: conditionName.get(v.encounter_condition_id), isDefault: v.is_default === "1" }]));
  const encValues = new Map();
  for (const m of conditionMap) {
    if (!encValues.has(m.encounter_id)) encValues.set(m.encounter_id, []);
    encValues.get(m.encounter_id).push(valueInfo.get(m.encounter_condition_value_id));
  }
  /** null = Sonderbedingung, sonst Varianten-Schlüssel ("" = immer) */
  const variantOf = (encId) => {
    const vals = encValues.get(encId) ?? [];
    if (vals.some((v) => !v.isDefault && !VARIANT.has(v.cond) && !UNION.has(v.cond))) return null;
    return vals.filter((v) => VARIANT.has(v.cond)).map((v) => v.name).sort().join("+");
  };

  // version slug -> locationId -> method -> variant -> Set<speciesId>
  const perGame = new Map();
  const at = (map, key, make) => map.get(key) ?? map.set(key, make()).get(key);
  for (const e of encounters) {
    const slug = verSlug.get(e.version_id);
    const loc = areaLoc.get(e.location_area_id);
    const m = slotMethod.get(e.encounter_slot_id);
    if (!slug || !loc || !m) continue;
    const byVariant = at(at(at(perGame, slug, () => new Map()), loc, () => new Map()), m, () => new Map());
    const variant = variantOf(e.id);
    // Methode bleibt sichtbar, auch wenn sie nur unter Sonderbedingungen vorkommt (dann 0 Slots)
    const set = at(byVariant, variant ?? SPECIAL, () => new Set());
    set.add(speciesOf.get(e.pokemon_id));
  }

  const toLocation = (id, byMethod) => {
    const l = locById.get(id);
    const present = METHOD_ORDER.filter((m) => byMethod.has(m));
    const loc = { id: l.identifier, name: lName(+id) ?? humanize(l.identifier), methods: present };
    if (present.length) loc.slots = Object.fromEntries(present.map((m) => [m, slotCount(byMethod.get(m))]));
    return loc;
  };
  const stats = [];
  for (const g of games) {
    const found = perGame.get(g.id);
    let list;
    if (found?.size) list = [...found].map(([id, ms]) => toLocation(id, ms));
    else {
      const rid = regionId.get(REGION_SLUG[g.region] ?? g.region.toLowerCase());
      if (!rid) throw new Error(`Region fehlt in PokeAPI: ${g.region}`);
      list = locations.filter((l) => l.region_id === rid).map((l) => toLocation(l.id, new Map()));
    }
    list.sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
    numberDuplicates(list);
    await json(path.join(DATA, "locations", `${g.id}.json`), list);
    stats.push(`${g.id}:${list.length}${found?.size ? "" : "*"}`);
  }
  console.log(`Spiele ${games.length}, Species ${species.length}, Moves ${moves.length}, Abilities ${abilities.length}`);
  console.log(`Orte (* = ohne Encounter-Daten, Regionsliste): ${stats.join(" ")}`);

  await sprites();
}

if (import.meta.main) main().catch((e) => { console.error(e); process.exit(1); });
