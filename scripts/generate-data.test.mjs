import { test } from "node:test";
import assert from "node:assert/strict";
import {
  abilitiesAt, areaLabel, encounterRows, evolutionOf, mergeEncounters, parseCsv, pickEvolutions, slotCount, statsAt, typesAt,
} from "./generate-data.mjs";

const SPECIAL_KEY = "\0special";

test("parseCsv: Quotes, Newline in Zelle, CRLF, ohne Schlusszeilenumbruch", () => {
  const text = 'id,name\r\n1,"a ""b"", c"\r\n2,"x\ny"\n3,';
  assert.deepEqual(parseCsv(text), [
    { id: "1", name: 'a "b", c' },
    { id: "2", name: "x\ny" },
    { id: "3", name: "" },
  ]);
});

test("parseCsv: Leerzeile am Ende ignoriert, falsche Spaltenzahl wirft", () => {
  assert.deepEqual(parseCsv("id,name\n1,a\n\n"), [{ id: "1", name: "a" }]);
  assert.throws(() => parseCsv("id,name\n1,a,b\n"));
});

test("slotCount: Tageszeiten als Maximum, Sonderbedingungen zählen nicht", () => {
  // HGSS Route 29 Gras: Rattfratz immer, tags Taubsi+Wiesor, nachts Hornliu, Radio nur als Sonderbedingung
  const r29 = new Map([
    ["", new Set([19])],
    ["time-day", new Set([16, 161])],
    ["time-morning", new Set([16, 161])],
    ["time-night", new Set([163, 19])],
    [SPECIAL_KEY, new Set([311, 312, 403])],
  ]);
  assert.equal(slotCount(r29), 3);
  assert.equal(slotCount(new Map([["", new Set([1, 2])]])), 2);
  assert.equal(slotCount(new Map([[SPECIAL_KEY, new Set([1])]])), 0);
});

/** "a,b\n1,2" → Zeilen wie aus dem CSV */
const rows = (text) => parseCsv(text.trim().replace(/^ +/gm, ""));

test("typesAt: Pixi Gen 5 Normal / Gen 6 Fee, Magnetilo Gen 1 nur Elektro", () => {
  const pixi = rows("pokemon_id,type_id,slot\n35,18,1"), pixiPast = rows("pokemon_id,generation_id,type_id,slot\n35,5,1,1");
  assert.deepEqual(typesAt(pixi, pixiPast, 5), [1]);
  assert.deepEqual(typesAt(pixi, pixiPast, 6), [18]);
  const magnet = rows("pokemon_id,type_id,slot\n81,9,2\n81,13,1"), magnetPast = rows("pokemon_id,generation_id,type_id,slot\n81,1,13,1");
  assert.deepEqual(typesAt(magnet, magnetPast, 1), [13]);
  assert.deepEqual(typesAt(magnet, magnetPast, 2), [13, 9]);
});

test("abilitiesAt: Gengar Schwebe bis Gen 6, Pixi ohne Slots vor ihrer Einführung, vor Gen 3 leer", () => {
  const gengar = rows("pokemon_id,ability_id,is_hidden,slot\n94,130,0,1");
  const gengarPast = rows("pokemon_id,generation_id,ability_id,is_hidden,slot\n94,6,26,0,1");
  assert.deepEqual(abilitiesAt(gengar, gengarPast, 6), [26]);
  assert.deepEqual(abilitiesAt(gengar, gengarPast, 7), [130]);
  const pixi = rows("pokemon_id,ability_id,is_hidden,slot\n35,56,0,1\n35,98,0,2\n35,132,1,3");
  const pixiPast = rows("pokemon_id,generation_id,ability_id,is_hidden,slot\n35,3,,0,2\n35,4,,1,3");
  assert.deepEqual(abilitiesAt(pixi, pixiPast, 2), []);
  assert.deepEqual(abilitiesAt(pixi, pixiPast, 3), [56]);
  assert.deepEqual(abilitiesAt(pixi, pixiPast, 4), [56, 98]);
  assert.deepEqual(abilitiesAt(pixi, pixiPast, 5), [56, 98, 132]);
  // Versteckte Fähigkeit vor Gen 5 auch ohne Past-Zeile weg; fehlender Slot 2 bleibt als 0 stehen
  const bisasam = rows("pokemon_id,ability_id,is_hidden,slot\n1,65,0,1\n1,34,1,3");
  assert.deepEqual(abilitiesAt(bisasam, [], 4), [65]);
  assert.deepEqual(abilitiesAt(bisasam, [], 5), [65, 0, 34]);
});

test("statsAt: Gen 1 Spezial in spa und spd, danach getrennt", () => {
  const glurak = rows("pokemon_id,stat_id,base_stat\n6,1,78\n6,2,84\n6,3,78\n6,4,109\n6,5,85\n6,6,100");
  const glurakPast = rows("pokemon_id,generation_id,stat_id,base_stat\n6,1,9,85");
  assert.deepEqual(statsAt(glurak, glurakPast, 1), { hp: 78, atk: 84, def: 78, spa: 85, spd: 85, spe: 100 });
  assert.deepEqual(statsAt(glurak, glurakPast, 2), { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 });
});

const EVO_HEAD = "evolved_species_id,evolution_trigger_id,version_group_id,trigger_item_id,minimum_level,location_id,held_item_id,time_of_day,minimum_happiness,trade_species_id,condition_expression";
const lookup = {
  trigger: (id) => ({ 1: "level-up", 2: "trade", 3: "use-item" })[id],
  item: (id) => ({ 81: "Mondstein", 210: "Metallmantel" })[id],
  move: (id) => `Attacke ${id}`,
  type: (id) => `Typ ${id}`,
  location: (id) => ({ 10: "Kraterberg" })[id],
  species: (id) => ({ 616: "Schnuthelm" })[id],
};

test("evolutionOf: Level, Item, Tausch, Freundschaft + Tageszeit, Ort, zufällig", () => {
  const [lvl, item, trade, tradeFor, espeon, magnezone, wurmple] = rows(`${EVO_HEAD}
    2,1,1,,16,,,,,,
    36,3,1,81,,,,,,,
    208,2,3,,,,210,,,,
    589,2,11,,,,,,,616,
    196,1,3,,,,,day,160,,
    462,1,8,,,10,,,,,
    266,1,5,,7,,,,,,PID 16 >> 10 % 5 >=`);
  assert.deepEqual(evolutionOf(lvl, lookup), { target: 2, method: "level", value: "16" });
  assert.deepEqual(evolutionOf(item, lookup), { target: 36, method: "item", value: "Mondstein" });
  assert.deepEqual(evolutionOf(trade, lookup), { target: 208, method: "other", value: "Tausch, hält Metallmantel" });
  assert.equal(evolutionOf(tradeFor, lookup).value, "Tausch, gegen Schnuthelm");
  assert.equal(evolutionOf(espeon, lookup).value, "Level-Up, Freundschaft, tagsüber");
  assert.equal(evolutionOf(magnezone, lookup).value, "Level-Up, Ort: Kraterberg");
  assert.equal(evolutionOf(wurmple, lookup).value, "Level 7, zufällig");
});

test("pickEvolutions: Ortsentwicklung nur in der Region, sonst neueste Version-Group ≤ Spiel", () => {
  // Magneton → Magnezone: Kraterberg (DP, Sinnoh), Route 13 (XY, Kalos), Donnerstein ab SwSh
  const magnezone = rows(`${EVO_HEAD}
    462,1,8,,,10,,,,,
    462,1,15,,,629,,,,,
    462,3,20,83,,,,,,,`);
  // vgId → order; Region: 4 Sinnoh, 2 Johto, 6 Kalos, 8 Galar
  const order = new Map([["8", 12], ["9", 13], ["10", 14], ["15", 17], ["20", 22], ["23", 25]]);
  const locRegion = new Map([["10", "4"], ["629", "6"]]);
  const pick = (vg, regionId) => pickEvolutions(magnezone, { order, gameOrder: order.get(vg), regionId, locRegion })
    .map((r) => r.location_id || r.trigger_item_id);
  assert.deepEqual(pick("10", "2"), []); // HGSS
  assert.deepEqual(pick("9", "4"), ["10"]); // Platin
  assert.deepEqual(pick("15", "6"), ["629"]); // X/Y
  assert.deepEqual(pick("20", "8"), ["83"]); // Schwert/Schild
});

test("pickEvolutions: Nicht-Standardzeilen nur in ihrer Version-Group, Regionszeilen ersetzen", () => {
  // Milotic: Schönheit (RS, nicht Standard), Tausch mit Schönschuppe (SW/WS, Standard), Schönheit wieder in ORAS
  const milotic = rows(`version_group_id,is_default,evolved_species_id,evolution_trigger_id
    5,0,350,1
    11,1,350,2
    16,0,350,1`);
  const order = new Map([["5", 7], ["9", 13], ["11", 15], ["16", 18], ["17", 19], ["24", 26]]);
  const pick = (gameOrder, list = milotic, regionId = "1") =>
    pickEvolutions(list, { order, gameOrder, regionId, locRegion: new Map() }).map((r) => r.version_group_id);
  assert.deepEqual(pick(13), ["5"]); // Platin
  assert.deepEqual(pick(15), ["11"]); // SW/WS
  assert.deepEqual(pick(18), ["11", "16"]); // ORAS
  assert.deepEqual(pick(19), ["11"]); // Sonne/Mond
  // Igelavar: Level 14, in Hisui Level 17
  const quilava = rows(`version_group_id,is_default,evolved_species_id,region_id
    5,1,156,
    24,0,156,9`);
  assert.deepEqual(pick(26, quilava, "9"), ["24"]);
  assert.deepEqual(pick(26, quilava, "10"), ["5"]);
});

const mergeInput = (extra) => ({
  gameId: "omega-ruby",
  list: [{ id: "hoenn-route-101", name: "Route 101", methods: ["walk", "surf"], slots: { walk: 3, surf: 1 } }],
  enc: { "hoenn-route-101": { walk: [[261, 2, 2], [263, 2, 2], [265, 2, 2]], surf: [[72, 20, 25]] } },
  places: [
    { id: "hoenn-route-101", label: "Route 101", kind: "route", points: [[0, 0]] },
    { id: "hoenn-sea-route-124", label: "Route 124", kind: "water", points: [[0, 0]] },
    { id: "mirage-spot", label: "Illusionsort", kind: "landmark", points: [[0, 0]], games: ["omega-ruby"] },
    { id: "only-emerald", label: "Nur Smaragd", kind: "city", points: [[0, 0]], games: ["emerald"] },
    { id: "deco-house", label: "Haus", kind: "landmark", points: [[0, 0]] },
  ],
  extra,
  speciesIds: new Set([72, 73, 261, 263, 265, 270]),
});

test("mergeEncounters: Methode ersetzt, andere bleiben, [] entfernt", () => {
  const i = mergeInput({ "hoenn-route-101": { surf: [[73, 30, 35], [72, 25, 30], [72, 20, 22]], "old-rod": [[72, 5, 10]] } });
  mergeEncounters(i);
  assert.deepEqual(i.enc["hoenn-route-101"], {
    walk: [[261, 2, 2], [263, 2, 2], [265, 2, 2]], surf: [[72, 20, 30], [73, 30, 35]], "old-rod": [[72, 5, 10]],
  });
  assert.deepEqual(i.list[0], { id: "hoenn-route-101", name: "Route 101", methods: ["walk", "surf", "old-rod"], slots: { walk: 3, surf: 2, "old-rod": 1 } });
  const j = mergeInput({ "hoenn-route-101": { walk: [], surf: [] } });
  mergeEncounters(j);
  assert.equal(j.enc["hoenn-route-101"], undefined);
  assert.deepEqual(j.list[0], { id: "hoenn-route-101", name: "Route 101", methods: [] });
});

test("mergeEncounters: sichtbare Kartenorte kommen dazu, auch mit Ergänzung", () => {
  const i = mergeInput({ "hoenn-sea-route-124": { surf: [[72, 25, 30]] } });
  mergeEncounters(i);
  assert.deepEqual(i.list.map((l) => l.id), ["hoenn-route-101", "hoenn-sea-route-124", "mirage-spot"]);
  assert.deepEqual(i.list[1], { id: "hoenn-sea-route-124", name: "Route 124", methods: ["surf"], slots: { surf: 1 } });
  assert.deepEqual(i.list[2], { id: "mirage-spot", name: "Illusionsort", methods: [] });
  assert.deepEqual(i.enc["hoenn-sea-route-124"], { surf: [[72, 25, 30]] });
});

test("mergeEncounters: ungültige Ergänzungen brechen ab", () => {
  const bad = [
    [{ "only-emerald": { walk: [[72, 5, 5]] } }, /Ort weder/],
    [{ "deco-house": { walk: [[72, 5, 5]] } }, /Ort weder/],
    [{ "hoenn-route-101": { fly: [[72, 5, 5]] } }, /unbekannte Methode fly/],
    [{ "hoenn-route-101": { walk: [[999, 5, 5]] } }, /unbekannte Art/],
    [{ "hoenn-route-101": { walk: [[72, 5]] } }, /unbekannte Art/],
    [{ "hoenn-route-101": { walk: [[72, 10, 5]] } }, /ungültige Level/],
    [{ "hoenn-route-101": { walk: [[72, 0, 5]] } }, /ungültige Level/],
    [{ "hoenn-route-101": { walk: [[72, "5", 5]] } }, /ungültige Level/],
  ];
  for (const [extra, msg] of bad) assert.throws(() => mergeEncounters(mergeInput(extra)), msg);
});

test("encounterRows: Häufigkeit je Tageszeit, Bedingungen, Bereiche", () => {
  const r = (sp, rarity, extra = {}) => ({ area: "EG", sp, min: 5, max: 5, rarity, dim: "", cond: "", ...extra });
  assert.deepEqual(encounterRows([
    r(16, 20), r(16, 10, { min: 3 }),
    r(19, 10, { dim: "time-morning" }), r(19, 10, { dim: "time-day" }), r(163, 10, { dim: "time-night" }),
    r(41, 30, { area: "1.UG" }),
    r(25, 5, { cond: "swarm-yes" }),
    ...["normal", "overcast", "raining", "thunderstorm", "intense-sun", "snowing", "snowstorm", "sandstorm", "fog"]
      .map((w) => r(52, 5, { cond: `weather-${w}` })),
    r(53, 5, { cond: "weather-raining" }), r(53, 5, { cond: "weather-fog" }),
  ]), [
    [16, 3, 5, 30, "", "EG"], [19, 5, 5, [10, 10, 0], "", "EG"], [163, 5, 5, [0, 0, 10], "", "EG"], [52, 5, 5, 5, "", "EG"],
    [25, 5, 5, 5, "swarm-yes", "EG"], [53, 5, 5, 5, "weather-raining weather-fog", "EG"],
    [41, 5, 5, 30, "", "1.UG"],
  ]);
  assert.deepEqual(encounterRows([r(16, 20, { area: "" })]), [[16, 5, 5, 20]]);
});

test("areaLabel: deutscher Klammertext, sonst Stockwerk aus dem Identifier", () => {
  assert.equal(areaLabel("b1f", "Mondberg (1.UG)"), "1.UG");
  assert.equal(areaLabel("1f", undefined), "EG");
  assert.equal(areaLabel("3f", undefined), "2.OG");
  assert.equal(areaLabel("b2f-a", undefined), "2.UG A");
  assert.equal(areaLabel("main", "Route 9"), "Hauptbereich");
});
