// Erzeugt static/data/** und static/sprites/** aus dem PokeAPI-CSV-Dump.
// Aufruf: npm run generate (idempotent: vorhandene Sprites werden übersprungen)
import { mkdir, writeFile, access, rename, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "static/data");
const SPRITES = path.join(ROOT, "static/sprites");
const EXTRA = path.join(ROOT, "scripts/encounters");
const CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const DE = 6;
const EN = 9;
const MAX_SPECIES = 1025;
// Spielstand-Import: Generationen und höchste Dex-Nr. (Gen 5)
const SAVE_GENERATIONS = [3, 5];
const MAX_SAVE_SPECIES = 649;

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
// Pokédexe ohne (passenden) deutschen Namen in PokeAPI
const DEX_NAME = { alola: "Alola", melemele: "Mele-Mele", akala: "Akala", ulaula: "Ula-Ula", poni: "Poni", kitakami: "Kitakami" };
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

const at = (map, key, make) => map.get(key) ?? map.set(key, make()).get(key);
const group = (rows, key) => {
  const m = new Map();
  for (const r of rows) at(m, r[key], () => []).push(r);
  return m;
};

/**
 * Zeilen, die in Generation gen galten. *_past-Zeilen gelten bis einschließlich generation_id:
 * je Schlüssel gewinnt die Past-Zeile mit der kleinsten generation_id ≥ gen, sonst die aktuelle.
 * Ohne key werden alle Zeilen gemeinsam ersetzt (Typen).
 */
export function pastFor(current, past, gen, key) {
  const later = past.filter((r) => +r.generation_id >= gen);
  if (!key) {
    if (!later.length) return current;
    const g = Math.min(...later.map((r) => +r.generation_id));
    return later.filter((r) => +r.generation_id === g);
  }
  const best = new Map();
  for (const r of later) if (!best.has(r[key]) || +r.generation_id < +best.get(r[key]).generation_id) best.set(r[key], r);
  return [...new Map([...current.map((r) => [r[key], r]), ...best]).values()];
}

/** type_ids in Slot-Reihenfolge */
export const typesAt = (current, past, gen) =>
  pastFor(current, past, gen).sort((a, b) => a.slot - b.slot).map((r) => +r.type_id);

/** ability_ids [Slot 1, Slot 2, versteckt], fehlender Slot = 0, ohne Nullen am Ende; vor Gen 3 leer, vor Gen 5 ohne versteckte */
export function abilitiesAt(current, past, gen) {
  if (gen < 3) return [];
  const bySlot = new Map(pastFor(current, past, gen, "slot").map((r) => [+r.slot, +r.ability_id || 0]));
  if (gen < 5) bySlot.delete(3);
  const out = [1, 2, 3].map((s) => bySlot.get(s) ?? 0);
  while (out.length && !out.at(-1)) out.pop();
  return out;
}

/** Base Stats; Gen 1: Spezial (stat_id 9) in spa und spd */
export function statsAt(current, past, gen) {
  const v = new Map(pastFor(current, past, gen, "stat_id").map((r) => [+r.stat_id, +r.base_stat]));
  const special = gen === 1 && v.get(9);
  return { hp: v.get(1), atk: v.get(2), def: v.get(3), spa: special || v.get(4), spd: special || v.get(5), spe: v.get(6) };
}

/**
 * Entwicklungszeilen einer Art, die im Spiel gelten (Heuristik, version_group_id = "eingeführt/geändert in"):
 * Orts-/Regionszeilen nur in der Region des Spiels, Regionszeilen ersetzen dann die allgemeinen. Sonst je Ziel
 * die Standardzeilen (is_default) der neuesten Version-Group ≤ Spiel; Nicht-Standardzeilen gelten daneben nur in
 * ihrer eigenen Version-Group (Milotic: Schönheit nur noch in ORAS) und ohne Standardzeile als neueste.
 * ctx: { order: Map<vgId, order> (DLC = Basisspiel), gameOrder, regionId, locRegion: Map<locId, regionId> }
 */
export function pickEvolutions(rows, ctx) {
  const ord = (r) => ctx.order.get(r.version_group_id);
  const newest = (rs) => rs.filter((r) => ord(r) === Math.max(...rs.map(ord)));
  const ok = rows.filter((r) => ord(r) <= ctx.gameOrder
    && (!r.location_id || ctx.locRegion.get(r.location_id) === ctx.regionId)
    && (!r.region_id || r.region_id === ctx.regionId));
  return [...group(ok, "evolved_species_id").values()].flatMap((mine) => {
    const rest = mine.filter((r) => !r.location_id);
    const regional = rest.filter((r) => r.region_id);
    const defaults = rest.filter((r) => r.is_default === "1");
    const picked = regional.length ? regional
      : defaults.length ? [...newest(defaults), ...rest.filter((r) => r.is_default !== "1" && ord(r) === ctx.gameOrder)]
      : newest(rest);
    return [...mine.filter((r) => r.location_id), ...picked];
  });
}

const TRIGGER_TEXT = {
  "level-up": "Level-Up", trade: "Tausch", "use-item": "Item", shed: "Freier Platz im Team und Pokéball (bei Entwicklung von Nincada)",
  spin: "Drehen mit Süßem Objekt", "tower-of-darkness": "Turm des Unlichts", "tower-of-waters": "Turm des Wassers",
  "three-critical-hits": "3 Volltreffer in einem Kampf", "take-damage": "Schaden genommen, dann durch den Steinbogen",
  "in-battle-level-up": "Level-Up im Kampf", "agile-style-move": "Attacke im Tempo-Stil", "strong-style-move": "Attacke im Kraft-Stil",
  "recoil-damage": "Rückstoßschaden erlitten", "use-move": "Attacke einsetzen",
  "three-defeated-bisharp": "3 Caesurio mit Anführersymbol besiegt", "gimmighoul-coins": "999 Gierspenst-Münzen",
  "meltan-candies": "400 Meltan-Bonbons (Pokémon GO)", unclassified: "Besondere Bedingung",
};
const TIME_TEXT = { day: "tagsüber", night: "nachts", dusk: "abends", "full-moon": "bei Vollmond" };
const PHYS_TEXT = { 1: "Angriff > Verteidigung", "-1": "Angriff < Verteidigung", 0: "Angriff = Verteidigung" };

/**
 * pokemon_evolution-Zeile → Evolution. lookup: { trigger, item, move, type, location, species } (id-String → Name)
 * Reines Level bzw. reines Item → method level/item, alles andere als deutscher Text.
 */
export function evolutionOf(r, lookup) {
  const target = +r.evolved_species_id;
  const trigger = lookup.trigger(r.evolution_trigger_id);
  const parts = [];
  if (r.minimum_level) parts.push(`Level ${r.minimum_level}`);
  if (r.trigger_item_id) parts.push(lookup.item(r.trigger_item_id));
  if (r.held_item_id) parts.push(`hält ${lookup.item(r.held_item_id)}`);
  if (r.minimum_happiness) parts.push("Freundschaft");
  if (r.minimum_affection) parts.push("Zuneigung");
  if (r.minimum_beauty) parts.push("Schönheit");
  if (r.time_of_day) parts.push(TIME_TEXT[r.time_of_day] ?? r.time_of_day);
  if (r.known_move_id) parts.push(`kennt ${lookup.move(r.known_move_id)}`);
  if (r.known_move_type_id) parts.push(`kennt ${lookup.type(r.known_move_type_id)}-Attacke`);
  if (r.location_id) parts.push(`Ort: ${lookup.location(r.location_id)}`);
  if (r.party_species_id) parts.push(`mit ${lookup.species(r.party_species_id)} im Team`);
  if (r.party_type_id) parts.push(`mit ${lookup.type(r.party_type_id)}-Pokémon im Team`);
  if (r.trade_species_id) parts.push(`gegen ${lookup.species(r.trade_species_id)}`);
  if (r.relative_physical_stats) parts.push(PHYS_TEXT[r.relative_physical_stats]);
  if (r.gender_id) parts.push(r.gender_id === "1" ? "nur weiblich" : "nur männlich");
  if (r.needs_overworld_rain === "1") parts.push("bei Regen");
  if (r.turn_upside_down === "1") parts.push("Konsole umdrehen");
  if (r.needs_multiplayer === "1") parts.push("im Union-Zirkel");
  if (r.used_move_id) parts.push(`${lookup.move(r.used_move_id)} ${r.minimum_move_count || 1}× eingesetzt`);
  if (r.minimum_steps) parts.push(`${r.minimum_steps} Schritte`);
  if (r.minimum_damage_taken) parts.push(`${r.minimum_damage_taken} KP Schaden`);
  if (r.nature_bitmask) parts.push("je nach Wesen");
  if (/^(PID|EC) /.test(r.condition_expression) || r.percentage_chance) parts.push("zufällig");
  if (parts.length === 1 && trigger === "level-up" && r.minimum_level) return { target, method: "level", value: r.minimum_level };
  if (parts.length === 1 && trigger === "use-item" && r.trigger_item_id) return { target, method: "item", value: parts[0] };
  // Level-Up und Item ergeben sich aus den Bausteinen, alle anderen Auslöser stehen vorn
  const lead = (trigger === "level-up" && r.minimum_level) || (trigger === "use-item" && r.trigger_item_id) ? [] : [TRIGGER_TEXT[trigger] ?? trigger];
  return { target, method: "other", value: [...lead, ...parts].join(", ") };
}

/** Map<Varianten-Schlüssel, Set<Species>> → Slots: Maximum über die Varianten, "" gilt in allen, SPECIAL zählt nie. */
export function slotCount(byVariant) {
  const always = byVariant.get("") ?? new Set();
  const variants = [...byVariant].filter(([k]) => k !== "" && k !== SPECIAL);
  if (!variants.length) return always.size;
  return Math.max(...variants.map(([, set]) => new Set([...always, ...set]).size));
}

/**
 * Ergänzt die Orte eines Spiels (list, enc werden verändert): jeder sichtbare Nicht-Deko-Kartenort kommt mit
 * Kartenlabel und ohne Methoden dazu, falls er fehlt; danach ersetzt jede (Ort, Methode) aus extra
 * (scripts/encounters/<gameId>.json) die PokeAPI-Einträge dieser Methode, [] entfernt sie.
 * Handgepflegte Daten: unbekannter Ort, unbekannte Methode, Art oder ungültige Level → Fehler.
 */
export function mergeEncounters({ gameId, list, enc, places, extra, speciesIds }) {
  const byId = new Map(list.map((l) => [l.id, l]));
  for (const p of places) {
    if (p.id.startsWith("deco-") || (p.games && !p.games.includes(gameId)) || byId.has(p.id)) continue;
    const loc = { id: p.id, name: p.label, methods: [] };
    list.push(loc);
    byId.set(p.id, loc);
  }
  for (const [locId, byMethod] of Object.entries(extra)) {
    const where = `scripts/encounters/${gameId}.json: ${locId}`;
    const loc = byId.get(locId);
    if (!loc) throw new Error(`${where}: Ort weder in PokeAPI noch auf der Karte des Spiels`);
    const methods = new Set(loc.methods);
    const slots = loc.slots ?? {};
    const byLoc = enc[locId] ?? {};
    for (const [m, entries] of Object.entries(byMethod)) {
      if (!METHOD_ORDER.includes(m)) throw new Error(`${where}: unbekannte Methode ${m}`);
      if (!Array.isArray(entries)) throw new Error(`${where}/${m}: Liste erwartet`);
      // gleiche Art mehrfach (z. B. verschiedene Bereiche) → ein Eintrag mit Level-Spanne, wie bei PokeAPI
      const range = new Map();
      for (const e of entries) {
        const [sp, min, max] = Array.isArray(e) && e.length === 3 ? e : [];
        if (!speciesIds.has(sp)) throw new Error(`${where}/${m}: unbekannte Art ${JSON.stringify(e)}`);
        if (![min, max].every((n) => Number.isInteger(n) && n >= 1 && n <= 100) || min > max) {
          throw new Error(`${where}/${m}: ungültige Level ${JSON.stringify(e)}`);
        }
        const r = range.get(sp);
        range.set(sp, r ? [Math.min(r[0], min), Math.max(r[1], max)] : [min, max]);
      }
      if (range.size) {
        byLoc[m] = [...range].map(([sp, [min, max]]) => [sp, min, max]).sort((a, b) => a[0] - b[0]);
        slots[m] = range.size;
        methods.add(m);
      } else {
        delete byLoc[m];
        delete slots[m];
        methods.delete(m);
      }
    }
    loc.methods = METHOD_ORDER.filter((m) => methods.has(m));
    if (loc.methods.length) loc.slots = Object.fromEntries(loc.methods.map((m) => [m, slots[m]]));
    else delete loc.slots;
    const ordered = Object.fromEntries(METHOD_ORDER.filter((m) => byLoc[m]).map((m) => [m, byLoc[m]]));
    if (Object.keys(ordered).length) enc[locId] = ordered;
    else delete enc[locId];
  }
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
const readJson = async (file) => {
  try { return JSON.parse(await readFile(file, "utf8")); } catch (e) { throw new Error(`${path.relative(ROOT, file)}: ${e.message}`); }
};
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
    conditions, conditionValues, conditionMap, pokemonTypes, pokemonTypesPast, pokemonAbilities, pokemonAbilitiesPast,
    pokemonStats, pokemonStatsPast, pokemonMoves, machines, items, itemNames, evolutionRows, evolutionTriggers,
    pokemonForms, itemIndices, experience, natures, natureNames, pokedexes, pokedexProse, pokedexGroups,
    dexNumbers] = await Promise.all([
    "versions", "version_groups", "pokemon_species", "pokemon_species_names", "moves", "move_names",
    "abilities", "ability_names", "types", "type_names", "regions", "locations", "location_names", "location_areas",
    "encounters", "encounter_slots", "encounter_methods", "pokemon",
    "encounter_conditions", "encounter_condition_values", "encounter_condition_value_map",
    "pokemon_types", "pokemon_types_past", "pokemon_abilities", "pokemon_abilities_past",
    "pokemon_stats", "pokemon_stats_past", "pokemon_moves", "machines", "items", "item_names",
    "pokemon_evolution", "evolution_triggers", "pokemon_forms", "item_game_indices", "experience",
    "natures", "nature_names", "pokedexes", "pokedex_prose", "pokedex_version_groups", "pokemon_dex_numbers",
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

  // Regionale Pokédexe je Spiel in Dex-Reihenfolge; National = alle Arten, daher nicht gespeichert
  const dexName = names(pokedexProse, "pokedex_id");
  const dexSpecies = new Map();
  for (const r of [...dexNumbers].sort((a, b) => a.pokedex_number - b.pokedex_number)) {
    if (+r.species_id > MAX_SPECIES) continue;
    if (!dexSpecies.has(r.pokedex_id)) dexSpecies.set(r.pokedex_id, []);
    dexSpecies.get(r.pokedex_id).push(+r.species_id);
  }
  const dexById = new Map(pokedexes.map((d) => [d.id, d]));
  const dexes = Object.fromEntries(games.map((g) => {
    const vg = versionBySlug.get(g.id).version_group_id;
    const list = pokedexGroups.filter((r) => r.version_group_id === vg && dexById.get(r.pokedex_id)?.is_main_series === "1")
      .map((r) => {
        const slug = dexById.get(r.pokedex_id).identifier.replace(/^(original|updated|extended)-/, "");
        const name = DEX_NAME[slug] ?? dexName(+r.pokedex_id).replace(/^(Original|Aktualisiertes|Erweitertes|Neue|Updated) /, "");
        return { id: slug, name, species: dexSpecies.get(r.pokedex_id) ?? [] };
      })
      .filter((d) => d.species.length && d.id !== "national");
    return [g.id, list];
  }));
  await json(path.join(DATA, "dexes.json"), dexes);

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
  // version slug -> Location-Slug -> method -> speciesId -> [min, max] (Originaldaten, ohne Sonderbedingungen)
  const levelsPerGame = new Map();
  const maxRaid = methods.find((m) => m.identifier === "max-raid")?.id;
  const slotRaw = new Map(slots.map((s) => [s.id, s.encounter_method_id]));
  for (const e of encounters) {
    const slug = verSlug.get(e.version_id);
    const loc = areaLoc.get(e.location_area_id);
    const m = slotMethod.get(e.encounter_slot_id);
    if (!slug || !loc || !m) continue;
    const byVariant = at(at(at(perGame, slug, () => new Map()), loc, () => new Map()), m, () => new Map());
    const variant = variantOf(e.id);
    const sp = +speciesOf.get(e.pokemon_id);
    // Methode bleibt sichtbar, auch wenn sie nur unter Sonderbedingungen vorkommt (dann 0 Slots)
    const set = at(byVariant, variant ?? SPECIAL, () => new Set());
    set.add(sp);
    if (variant === null || slotRaw.get(e.encounter_slot_id) === maxRaid) continue;
    const bySpecies = at(at(at(levelsPerGame, slug, () => new Map()), locById.get(loc).identifier, () => new Map()), m, () => new Map());
    const range = bySpecies.get(sp);
    if (range) bySpecies.set(sp, [Math.min(range[0], +e.min_level), Math.max(range[1], +e.max_level)]);
    else bySpecies.set(sp, [+e.min_level, +e.max_level]);
  }

  const toLocation = (id, byMethod) => {
    const l = locById.get(id);
    const present = METHOD_ORDER.filter((m) => byMethod.has(m));
    const loc = { id: l.identifier, name: lName(+id) ?? humanize(l.identifier), methods: present };
    if (present.length) loc.slots = Object.fromEntries(present.map((m) => [m, slotCount(byMethod.get(m))]));
    return loc;
  };
  // Handgepflegte Ergänzungen; Tippfehler im Dateinamen sollen nicht still ignoriert werden
  const extraFiles = (await readdir(EXTRA)).filter((f) => f.endsWith(".json"));
  for (const f of extraFiles) if (!games.some((g) => `${g.id}.json` === f)) throw new Error(`scripts/encounters/${f}: unbekanntes Spiel`);
  const speciesIds = new Set(species.map((s) => s.id));
  const encByGame = new Map();
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
    const enc = {};
    for (const [loc, byMethod] of levelsPerGame.get(g.id) ?? []) {
      for (const m of METHOD_ORDER.filter((x) => byMethod.has(x))) {
        (enc[loc] ??= {})[m] = [...byMethod.get(m)].map(([sp, [min, max]]) => [sp, min, max]).sort((a, b) => a[0] - b[0]);
      }
    }
    const { places } = await readJson(path.join(DATA, "maps", `${g.region.toLowerCase()}.json`));
    const hasExtra = extraFiles.includes(`${g.id}.json`);
    const extra = hasExtra ? await readJson(path.join(EXTRA, `${g.id}.json`)) : {};
    mergeEncounters({ gameId: g.id, list, enc, places, extra, speciesIds });
    encByGame.set(g.id, enc);
    list.sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
    numberDuplicates(list);
    await json(path.join(DATA, "locations", `${g.id}.json`), list);
    stats.push(`${g.id}:${list.length}${found?.size ? "" : "*"}${hasExtra ? "+" : ""}`);
  }
  console.log(`Spiele ${games.length}, Species ${species.length}, Moves ${moves.length}, Abilities ${abilities.length}`);
  console.log(`Orte (* = ohne Encounter-Daten, Regionsliste; + = mit Ergänzung): ${stats.join(" ")}`);

  // ---------- Originaldaten pro Spiel (original/<gameId>.json) ----------
  await mkdir(path.join(DATA, "original"), { recursive: true });
  const vgById = new Map(versionGroups.map((g) => [g.id, g]));
  const vgBySlug = new Map(versionGroups.map((g) => [g.identifier, g]));
  // DLC-Learnsets stehen in der Version-Group des Basisspiels, DLC-Entwicklungen gelten dort ebenso
  const DLC_BASE = { "the-isle-of-armor": "sword-shield", "the-crown-tundra": "sword-shield", "the-teal-mask": "scarlet-violet", "the-indigo-disk": "scarlet-violet" };
  const vgOrder = new Map(versionGroups.map((g) => [g.id, +(vgBySlug.get(DLC_BASE[g.identifier])?.order ?? g.order)]));
  // BDSP: machines.csv kennt nur 17 Einträge (davon 8 VMs, die es im Spiel nicht gibt) → TMs ohne Nummer
  const NO_TM_NUMBERS = new Set(["brilliant-diamond-shining-pearl"]);
  const TUTOR_INSTEAD_OF_TM = new Set(["legends-arceus"]);
  // BDSP übernimmt die Entwicklungsregeln von Platin (sonst gälten z. B. die Steine aus SwSh zusätzlich zum Ort)
  const EVOLUTIONS_AS = { "brilliant-diamond-shining-pearl": "platinum" };
  // Legenden: Arceus kennt keinen Tausch: Halte-Item bzw. Verbindungsschnur wird eingesetzt
  const NO_TRADE = new Set(["legends-arceus"]);
  const evoTrigger = new Map(evolutionTriggers.map((t) => [t.identifier, t.id]));
  const linkingCord = items.find((i) => i.identifier === "linking-cord").id;
  const tradeAsItem = (r) => (r.evolution_trigger_id === evoTrigger.get("trade")
    ? { ...r, evolution_trigger_id: evoTrigger.get("use-item"), trigger_item_id: r.held_item_id || linkingCord, held_item_id: "" }
    : r);
  // Regionalform des Spiels (Darmanitan: Standard-, Tauros: Kampfrasse-Form)
  const REGIONAL = { Alola: "alola", Galar: "galar", Hisui: "hisui", Paldea: "paldea" };
  const pokemonSlug = new Map(pokemonRows.map((p) => [p.id, p.identifier]));
  const moveIds = new Set(moves.map((m) => m.id));
  const itemSlug = new Map(items.map((i) => [i.id, i.identifier]));
  const iName = names(itemNames, "item_id");

  // Spielstand-Import (src-tauri/src/savefile.rs): Item-Nummern je Generation, EXP-Kurven für das Level in Boxen
  const saveItems = {};
  for (const r of itemIndices.filter((r) => SAVE_GENERATIONS.includes(+r.generation_id))) {
    (saveItems[r.generation_id] ??= {})[r.game_index] = iName(+r.item_id) ?? humanize(itemSlug.get(r.item_id));
  }
  const growth = [0, ...speciesRows.filter((r) => +r.id <= MAX_SAVE_SPECIES).sort((a, b) => a.id - b.id).map((r) => +r.growth_rate_id)];
  // experience[growth - 1][level - 1] = EXP ab diesem Level
  const expCurves = [...group(experience, "growth_rate_id")].sort(([a], [b]) => a - b)
    .map(([, rows]) => rows.sort((a, b) => a.level - b.level).map((r) => +r.experience));
  const nName = names(natureNames, "nature_id");
  const natureList = natures.sort((a, b) => a.game_index - b.game_index).map((n) => nName(+n.id) ?? n.identifier);
  await json(path.join(DATA, "savegame.json"), { items: saveItems, growth, experience: expCurves, natures: natureList });
  const machineLabel = new Map(machines.map((m) => [`${m.version_group_id}:${m.move_id}`,
    itemSlug.get(m.item_id).replace(/^hm/, "vm").toUpperCase()]));
  const typeSlug = new Map(typeRows.map((t) => [t.id, t.identifier]));
  const defaultPokemon = new Set(pokemonRows.filter((p) => p.is_default === "1" && +p.species_id <= MAX_SPECIES).map((p) => p.id));
  const formPokemon = new Map(pokemonForms.map((f) => [f.id, f.pokemon_id]));
  const evolvesFrom = new Map(speciesRows.map((r) => [r.id, r.evolves_from_species_id]));
  const evoBySource = group(evolutionRows.map((r) => ({ ...r, from: evolvesFrom.get(r.evolved_species_id) })), "from");
  const triggerSlug = new Map(evolutionTriggers.map((t) => [t.id, t.identifier]));
  const lookup = {
    trigger: (id) => triggerSlug.get(id),
    item: (id) => iName(+id) ?? humanize(itemSlug.get(id)),
    move: (id) => mName(+id),
    type: (id) => tName(+id),
    location: (id) => lName(+id) ?? humanize(locById.get(id).identifier),
    species: (id) => sName(+id),
  };
  const locRegion = new Map(locations.map((l) => [l.id, l.region_id]));
  const typesBy = group(pokemonTypes, "pokemon_id"), typesPastBy = group(pokemonTypesPast, "pokemon_id");
  const abilBy = group(pokemonAbilities, "pokemon_id"), abilPastBy = group(pokemonAbilitiesPast, "pokemon_id");
  const statsBy = group(pokemonStats, "pokemon_id"), statsPastBy = group(pokemonStatsPast, "pokemon_id");
  const movesByVg = group(pokemonMoves.filter((r) => moveIds.has(+r.move_id)), "version_group_id");

  const originalStats = [];
  for (const g of games) {
    const vg = vgById.get(versionBySlug.get(g.id).version_group_id);
    const gen = g.generation;
    const tmMethod = TUTOR_INSTEAD_OF_TM.has(vg.identifier) ? "3" : "4";
    const learn = group(movesByVg.get(vg.id) ?? [], "pokemon_id");
    // Arten ohne Level-Up-Attacken kommen im Spiel nicht vor (Dexit). Je Art die Regionalform des Spiels, dann
    // die Standardform, sonst die erste Form mit Learnset (Legenden: Arceus kennt z. B. Kleinstein nur als Hisui-Form).
    const regionalRe = REGIONAL[g.region] && new RegExp(`-${REGIONAL[g.region]}(-standard|-combat-breed)?$`);
    const isRegional = (pid) => !!regionalRe?.test(pokemonSlug.get(pid));
    const rank = (pid) => (isRegional(pid) ? 0 : defaultPokemon.has(pid) ? 1 : 2);
    const formOf = new Map();
    for (const [pid, rs] of [...learn].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0] - b[0])) {
      const sp = speciesOf.get(pid);
      if (+sp <= MAX_SPECIES && !formOf.has(sp) && rs.some((r) => r.pokemon_move_method_id === "1")) formOf.set(sp, pid);
    }
    const inGame = new Set(formOf.keys());
    // Zeile passt zur gewählten Form: Form-ID gesetzt → genau diese Form; ohne → nicht für Regionalformen
    const formFits = (formId, sp) => (formId ? formPokemon.get(formId) === formOf.get(sp) : !isRegional(formOf.get(sp)));
    const evoVg = vgBySlug.get(EVOLUTIONS_AS[vg.identifier])?.id ?? vg.id;
    const ctx = { order: vgOrder, gameOrder: vgOrder.get(evoVg), regionId: regionId.get(REGION_SLUG[g.region] ?? g.region.toLowerCase()), locRegion };
    const label = (moveId) => (NO_TM_NUMBERS.has(vg.identifier) ? undefined : machineLabel.get(`${vg.id}:${moveId}`));
    const machinesUsed = {};
    const pokemon = {};
    for (const id of [...inGame].sort((a, b) => a - b)) {
      const pid = formOf.get(id);
      const rs = learn.get(pid);
      const levelMoves = [...new Map(rs.filter((r) => r.pokemon_move_method_id === "1")
        .sort((a, b) => a.level - b.level || a.order - b.order)
        .map((r) => [`${r.level}:${r.move_id}`, [+r.level, +r.move_id]])).values()];
      const tmMoves = [...new Set(rs.filter((r) => r.pokemon_move_method_id === tmMethod).map((r) => +r.move_id))]
        .sort((a, b) => (label(a) ?? "").localeCompare(label(b) ?? "", "en", { numeric: true }) || a - b);
      for (const m of tmMoves) if (label(m)) machinesUsed[m] = label(m);
      const evoRows = (evoBySource.get(id) ?? []).filter((r) => inGame.has(r.evolved_species_id)
        && formFits(r.required_pokemon_form_id, id) && formFits(r.evolved_pokemon_form_id, r.evolved_species_id));
      const evolutions = [...new Map(pickEvolutions(evoRows, ctx)
        .map((r) => evolutionOf(NO_TRADE.has(vg.identifier) ? tradeAsItem(r) : r, lookup))
        .map((e) => [`${e.target}:${e.value}`, e])).values()];
      pokemon[id] = {
        types: typesAt(typesBy.get(pid), typesPastBy.get(pid) ?? [], gen).map((t) => typeSlug.get(String(t))),
        abilities: abilitiesAt(abilBy.get(pid) ?? [], abilPastBy.get(pid) ?? [], gen).map((a) => (a ? aName(a) : "")),
        stats: statsAt(statsBy.get(pid), statsPastBy.get(pid) ?? [], gen),
        levelMoves, tmMoves, evolutions,
      };
    }
    const enc = encByGame.get(g.id);
    await json(path.join(DATA, "original", `${g.id}.json`), { machines: machinesUsed, ...(TUTOR_INSTEAD_OF_TM.has(vg.identifier) && { tutor: true }), pokemon, encounters: enc });
    originalStats.push(`${g.id}:${inGame.size}/${Object.keys(enc).length}`);
  }
  console.log(`Originaldaten (Arten/Orte): ${originalStats.join(" ")}`);

  await sprites();
}

if (import.meta.main) main().catch((e) => { console.error(e); process.exit(1); });
