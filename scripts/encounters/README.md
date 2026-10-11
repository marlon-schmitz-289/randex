# Handgepflegte Encounter-Ergänzungen

Für Orte, zu denen PokeAPI keine oder falsche Encounter-Daten hat. `npm run generate` mergt sie in
`static/data/locations/<gameId>.json` und `static/data/original/<gameId>.json`.

## Format

Eine Datei pro Spiel, `<gameId>.json` (`Game.id`, z. B. `brilliant-diamond.json`):

```json
{
  "sinnoh-route-201": {
    "walk": [[396, 2, 3], [399, 2, 3]],
    "surf": [[54, 20, 30]]
  }
}
```

- Schlüssel: `Location.id` aus `static/data/locations/<gameId>.json` oder `id` eines Ortes der Regionskarte
  (`static/data/maps/<region>.json`, nicht `deco-`, im Spiel sichtbar laut `games`).
- Methoden: `ENCOUNTER_METHODS` aus `src/lib/types.ts` (`walk`, `surf`, `old-rod`, `static`, `gift`, …).
- Einträge: `[speciesId, minLevel, maxLevel]` (National-Dex-Nr., Level 1–100, min ≤ max). Dieselbe Art
  mehrfach ergibt einen Eintrag mit der Level-Spanne.

## Merge-Regel

Je (Ort, Methode) ersetzt die Ergänzung die PokeAPI-Einträge dieser Methode komplett; andere Methoden des
Ortes bleiben. `[]` entfernt die Methode. Slots = Anzahl verschiedener Arten. Ungültige Daten (unbekannter
Ort, Methode oder Art, falsche Level, unbekanntes Spiel im Dateinamen) brechen den Generator ab.

## Quellen

JSON kennt keine Kommentare, deshalb hier je Datei eine Zeile `- <gameId>.json: <URL>, <URL>` mit den
Quellen (z. B. Bulbapedia, Serebii, Bisafans).
- gold.json, silver.json: https://www.serebii.net/gs/legends.shtml, https://www.pokewiki.de/Raikou, https://www.pokewiki.de/Entei, https://www.pokewiki.de/Suicune
- crystal.json: https://serebii.net/crystal/legends.shtml, https://www.pokewiki.de/Raikou, https://www.pokewiki.de/Entei
- heartgold.json, soulsilver.json: https://www.pokewiki.de/Sinjoh-Ruinen, https://www.serebii.net/pokearth/johto/sinjohruins.shtml, https://www.serebii.net/heartgoldsoulsilver/legends.shtml, https://www.pokewiki.de/Raikou, https://www.pokewiki.de/Entei
- firered.json, leafgreen.json: https://www.serebii.net/pokearth/kanto/3rd, https://www.gamepro.de/artikel/pokemon-feuerrot-blattgruen-alle-legendaeren-pokemon-fangen-fundorte,3449125,seite4.html, https://www.pokewiki.de/Raikou
- lets-go-pikachu.json, lets-go-eevee.json: https://www.pokewiki.de/Vertania_City

## legends-arceus

`legends-arceus.json` – PokeAPI hat für Legenden: Arceus keine Encounter. Quellen:

- Wilde Pokémon je Unterort: Serebii Pokéarth, https://www.serebii.net/pokearth/hisui/<unterort>.shtml
  (z. B. https://www.serebii.net/pokearth/hisui/horseshoeplains.shtml). Erfasst sind nur Arten mit dem
  Tag „Obtained in <Unterort>“; Spawns zwischen den benannten Unterorten fehlen.
- Legendäre/Story: https://www.serebii.net/legendsarceus/legendary.shtml
- Geschenke: https://www.serebii.net/legendsarceus/gift.shtml
- Raum-Zeit-Verzerrungen: https://www.serebii.net/legendsarceus/space-timedistortions.shtml
- Missions-Pokémon und fehlende Icognito: PokéWiki-Ortsartikel, z. B. https://www.pokewiki.de/Großmaulmoor,
  https://www.pokewiki.de/Pfad_zum_Kampffeld, https://www.pokewiki.de/Jubeldorf
- Stichprobe Gebietszuordnung: PokéWiki-Artikel der Arten (Abschnitt Fangorte, PLA)

Methoden-Zuordnung:

- `walk`: normale Spawns am Boden und in der Luft, schüttelnde Bäume und Erzvorkommen, Massenaufläufe
  (Serebii „Standard Spawn“, „In Air“, „Flying“, „Shaking Tree/Ore Deposits“, „Mass Outbreak“).
- `surf`: Wasser-Spawns (Serebii „Swimming“).
- `other`: Alpha-Pokémon (feste Alpha-Spawns und Alpha-Varianten aller Tabellen).
- `static`: Legendäre, Story- und Missions-Begegnungen sowie die festen Icognito-Spots.
- `gift`: Starter (Galaktik-Gebäude, Jubeldorf) und Alola-Vulpix (Nebenmission, Blizzardtal).
- Raum-Zeit-Verzerrungen aller Unterorte sind unter `space-time-distortion` zusammengefasst (`walk`/`other`).
- Hisui-Formen zählen zur Spezies-ID. Level: kleinstes Minimum bis größtes Maximum über Tageszeit/Wetter.
- Nicht erfasst: nicht fangbare Begegnungen (Elite-Pokémon der Kampffelder, Missions-Kämpfe), Basislager.
- Voltolos (Gewitter zwischen Sandfinger und Großfischfelsen) steht unter `sands-reach`, Heatran (Lavadom-Schrein)
  unter `firespit-island`, Arceus unter `temple-of-sinnoh`.

## diamond

- `floaroma-meadow` (Honigbaum, `other`): https://www.serebii.net/pokearth/sinnoh/4th/floaromameadow.shtml, https://www.pokewiki.de/Honigbaum
- `mining-museum` (Fossilien, `gift`): https://www.pokewiki.de/Erzelingen, https://www.serebii.net/pokearth/sinnoh/4th/oreburghcity.shtml
- `acuity-cavern`/`valor-cavern` (Selfe/Tobutz; aus `lake-acuity`/`lake-valor` dorthin verschoben):
  https://www.pokewiki.de/See_der_Stärke_(Sinnoh), https://www.pokewiki.de/See_der_Kühnheit_(Sinnoh),
  https://www.serebii.net/pokearth/sinnoh/4th/lakeacuity.shtml, https://www.serebii.net/pokearth/sinnoh/4th/lakevalor.shtml
- `roaming-sinnoh` (Vesprit, Cresselia): https://www.pokewiki.de/Wanderpokémon, https://www.pokewiki.de/See_der_Wahrheit_(Sinnoh),
  https://www.pokewiki.de/Vollmondinsel, https://www.serebii.net/platinum/roaming.shtml

## pearl

Wie `diamond`, Honigbaum mit Panekon statt Schaloko (gleiche Quellen).

## platinum

- `floaroma-meadow`, `mining-museum`, `acuity-cavern`/`valor-cavern`: Quellen wie `diamond` (Honigbaum ohne Schaloko/Panekon)
- `spear-pillar` (Dialga/Palkia Lv. 70): https://www.pokewiki.de/Speersäule, https://www.serebii.net/pokearth/sinnoh/4th/spearpillar.shtml
- `rock-peak-ruins`/`iceberg-ruins`/`iron-ruins` (Regis, nur mit Event-Regigigas): https://www.pokewiki.de/Gipfelruinen,
  https://www.pokewiki.de/Eisberg-Ruinen, https://www.pokewiki.de/Eisen-Ruinen, https://www.serebii.net/pokearth/sinnoh/4th/route228.shtml,
  https://www.serebii.net/pokearth/sinnoh/4th/ironisland.shtml
- `roaming-sinnoh` (Vesprit, Cresselia, Arktos/Zapdos/Lavados Lv. 60): https://www.pokewiki.de/Wanderpokémon, https://www.serebii.net/platinum/roaming.shtml

### brilliant-diamond

- brilliant-diamond.json: https://www.pokewiki.de/Alte_Villa, https://www.pokewiki.de/Auen_von_Flori, https://www.pokewiki.de/Bizarre_H%C3%B6hle_%28Sinnoh%29, https://www.pokewiki.de/Blizzach-Tempel, https://www.pokewiki.de/Blumenparadies, https://www.pokewiki.de/Eiseninsel, https://www.pokewiki.de/Elyses, https://www.pokewiki.de/Erholungsareal, https://www.pokewiki.de/Erzelingen, https://www.pokewiki.de/Erzelingen-Mine, https://www.pokewiki.de/Erzelingen-Tor, https://www.pokewiki.de/Ewigenau, https://www.pokewiki.de/Ewigwald, https://www.pokewiki.de/Feurio-H%C3%BCtte, https://www.pokewiki.de/Fleetburg, https://www.pokewiki.de/Flori, https://www.pokewiki.de/Gro%C3%9Fmoor, https://www.pokewiki.de/Halle_des_Beginns, https://www.pokewiki.de/Herzhofen, https://www.pokewiki.de/H%C3%B6hle_der_Umkehr_%28Sinnoh%29, https://www.pokewiki.de/Kahlberg, https://www.pokewiki.de/Kraterberg, https://www.pokewiki.de/K%C3%BChnheitsufer, https://www.pokewiki.de/Maniac-Tunnel, https://www.pokewiki.de/Neumondinsel, https://www.pokewiki.de/Pok%C3%A9mon-Landgut, https://www.pokewiki.de/Pok%C3%A9mon-Liga_%28Sinnoh%29, https://www.pokewiki.de/Route_201_%28Sinnoh%29, https://www.pokewiki.de/Route_202_%28Sinnoh%29, https://www.pokewiki.de/Route_203_%28Sinnoh%29, https://www.pokewiki.de/Route_204_%28Sinnoh%29, https://www.pokewiki.de/Route_205_%28Sinnoh%29, https://www.pokewiki.de/Route_206_%28Sinnoh%29, https://www.pokewiki.de/Route_207_%28Sinnoh%29, https://www.pokewiki.de/Route_208_%28Sinnoh%29, https://www.pokewiki.de/Route_209_%28Sinnoh%29, https://www.pokewiki.de/Route_210_%28Sinnoh%29, https://www.pokewiki.de/Route_211_%28Sinnoh%29, https://www.pokewiki.de/Route_212_%28Sinnoh%29, https://www.pokewiki.de/Route_213_%28Sinnoh%29, https://www.pokewiki.de/Route_214_%28Sinnoh%29, https://www.pokewiki.de/Route_215_%28Sinnoh%29, https://www.pokewiki.de/Route_216_%28Sinnoh%29, https://www.pokewiki.de/Route_217_%28Sinnoh%29, https://www.pokewiki.de/Route_218_%28Sinnoh%29, https://www.pokewiki.de/Route_219_%28Sinnoh%29, https://www.pokewiki.de/Route_220_%28Sinnoh%29, https://www.pokewiki.de/Route_221_%28Sinnoh%29, https://www.pokewiki.de/Route_222_%28Sinnoh%29, https://www.pokewiki.de/Route_223_%28Sinnoh%29, https://www.pokewiki.de/Route_224_%28Sinnoh%29, https://www.pokewiki.de/Route_225_%28Sinnoh%29, https://www.pokewiki.de/Route_226_%28Sinnoh%29, https://www.pokewiki.de/Route_227_%28Sinnoh%29, https://www.pokewiki.de/Route_228_%28Sinnoh%29, https://www.pokewiki.de/Route_229_%28Sinnoh%29, https://www.pokewiki.de/Route_230_%28Sinnoh%29, https://www.pokewiki.de/Scheidequelle, https://www.pokewiki.de/See_der_K%C3%BChnheit_%28Sinnoh%29, https://www.pokewiki.de/See_der_St%C3%A4rke_%28Sinnoh%29, https://www.pokewiki.de/See_der_Wahrheit_%28Sinnoh%29, https://www.pokewiki.de/Siegesstra%C3%9Fe_%28Sinnoh%29, https://www.pokewiki.de/Sonnewik, https://www.pokewiki.de/Speers%C3%A4ule, https://www.pokewiki.de/St%C3%A4rkeufer, https://www.pokewiki.de/Trostu-Ruinen, https://www.pokewiki.de/Turm_der_Ruhenden, https://www.pokewiki.de/Verw%C3%BCsteter_Pfad, https://www.pokewiki.de/Wanderpok%C3%A9mon, https://www.pokewiki.de/Weideburg, https://www.pokewiki.de/Windkraftwerk, https://www.pokewiki.de/Zweiblattdorf
  Methoden: Gras/Höhle/Gebäude → `walk`, Pokéradar → `shaking`, Schwarm und Honigbaum → `other`, Wanderpokémon (Vesprit, Cresselia) → `other` bei `roaming-sinnoh`, Geschenke/Starter/Eier (Lv. 1)/Fossilien (Bergbau-Museum) → `gift`, einmalige Begegnungen → `static`, Barschwa-Felder → `fishing-spots`. Tausche nicht erfasst. Gegengeprüft mit https://www.serebii.net/pokearth/sinnoh/ (BDSP-Tabellen).

### shining-pearl

- shining-pearl.json: https://www.pokewiki.de/Alte_Villa, https://www.pokewiki.de/Auen_von_Flori, https://www.pokewiki.de/Bizarre_H%C3%B6hle_%28Sinnoh%29, https://www.pokewiki.de/Blizzach-Tempel, https://www.pokewiki.de/Blumenparadies, https://www.pokewiki.de/Eiseninsel, https://www.pokewiki.de/Elyses, https://www.pokewiki.de/Erholungsareal, https://www.pokewiki.de/Erzelingen, https://www.pokewiki.de/Erzelingen-Mine, https://www.pokewiki.de/Erzelingen-Tor, https://www.pokewiki.de/Ewigenau, https://www.pokewiki.de/Ewigwald, https://www.pokewiki.de/Feurio-H%C3%BCtte, https://www.pokewiki.de/Fleetburg, https://www.pokewiki.de/Flori, https://www.pokewiki.de/Gro%C3%9Fmoor, https://www.pokewiki.de/Halle_des_Beginns, https://www.pokewiki.de/Herzhofen, https://www.pokewiki.de/H%C3%B6hle_der_Umkehr_%28Sinnoh%29, https://www.pokewiki.de/Kahlberg, https://www.pokewiki.de/Kraterberg, https://www.pokewiki.de/K%C3%BChnheitsufer, https://www.pokewiki.de/Maniac-Tunnel, https://www.pokewiki.de/Neumondinsel, https://www.pokewiki.de/Pok%C3%A9mon-Landgut, https://www.pokewiki.de/Pok%C3%A9mon-Liga_%28Sinnoh%29, https://www.pokewiki.de/Route_201_%28Sinnoh%29, https://www.pokewiki.de/Route_202_%28Sinnoh%29, https://www.pokewiki.de/Route_203_%28Sinnoh%29, https://www.pokewiki.de/Route_204_%28Sinnoh%29, https://www.pokewiki.de/Route_205_%28Sinnoh%29, https://www.pokewiki.de/Route_206_%28Sinnoh%29, https://www.pokewiki.de/Route_207_%28Sinnoh%29, https://www.pokewiki.de/Route_208_%28Sinnoh%29, https://www.pokewiki.de/Route_209_%28Sinnoh%29, https://www.pokewiki.de/Route_210_%28Sinnoh%29, https://www.pokewiki.de/Route_211_%28Sinnoh%29, https://www.pokewiki.de/Route_212_%28Sinnoh%29, https://www.pokewiki.de/Route_213_%28Sinnoh%29, https://www.pokewiki.de/Route_214_%28Sinnoh%29, https://www.pokewiki.de/Route_215_%28Sinnoh%29, https://www.pokewiki.de/Route_216_%28Sinnoh%29, https://www.pokewiki.de/Route_217_%28Sinnoh%29, https://www.pokewiki.de/Route_218_%28Sinnoh%29, https://www.pokewiki.de/Route_219_%28Sinnoh%29, https://www.pokewiki.de/Route_220_%28Sinnoh%29, https://www.pokewiki.de/Route_221_%28Sinnoh%29, https://www.pokewiki.de/Route_222_%28Sinnoh%29, https://www.pokewiki.de/Route_223_%28Sinnoh%29, https://www.pokewiki.de/Route_224_%28Sinnoh%29, https://www.pokewiki.de/Route_225_%28Sinnoh%29, https://www.pokewiki.de/Route_226_%28Sinnoh%29, https://www.pokewiki.de/Route_227_%28Sinnoh%29, https://www.pokewiki.de/Route_228_%28Sinnoh%29, https://www.pokewiki.de/Route_229_%28Sinnoh%29, https://www.pokewiki.de/Route_230_%28Sinnoh%29, https://www.pokewiki.de/Scheidequelle, https://www.pokewiki.de/See_der_K%C3%BChnheit_%28Sinnoh%29, https://www.pokewiki.de/See_der_St%C3%A4rke_%28Sinnoh%29, https://www.pokewiki.de/See_der_Wahrheit_%28Sinnoh%29, https://www.pokewiki.de/Siegesstra%C3%9Fe_%28Sinnoh%29, https://www.pokewiki.de/Sonnewik, https://www.pokewiki.de/Speers%C3%A4ule, https://www.pokewiki.de/St%C3%A4rkeufer, https://www.pokewiki.de/Trostu-Ruinen, https://www.pokewiki.de/Turm_der_Ruhenden, https://www.pokewiki.de/Verw%C3%BCsteter_Pfad, https://www.pokewiki.de/Wanderpok%C3%A9mon, https://www.pokewiki.de/Weideburg, https://www.pokewiki.de/Windkraftwerk, https://www.pokewiki.de/Zweiblattdorf
  Methoden: Gras/Höhle/Gebäude → `walk`, Pokéradar → `shaking`, Schwarm und Honigbaum → `other`, Wanderpokémon (Vesprit, Cresselia) → `other` bei `roaming-sinnoh`, Geschenke/Starter/Eier (Lv. 1)/Fossilien (Bergbau-Museum) → `gift`, einmalige Begegnungen → `static`, Barschwa-Felder → `fishing-spots`. Tausche nicht erfasst. Gegengeprüft mit https://www.serebii.net/pokearth/sinnoh/ (BDSP-Tabellen).

## black

- `nacrene-city` (Fossilien Lv. 25, `gift`): https://www.pokewiki.de/Septerna_City, https://www.serebii.net/pokearth/unova/nacrenecity.shtml

## white

Wie `black` (gleiche Quellen).

## x

- `unknown-dungeon` (Mewtu Lv. 70): https://www.pokewiki.de/Pokémon-Dorf, https://www.serebii.net/xy/legendary.shtml
- `sea-spirits-den`/`roaming-kalos` (Arktos/Zapdos/Lavados Lv. 70, starterabhängig): https://www.pokewiki.de/Meerestitanenhöhle,
  https://www.serebii.net/xy/legendary.shtml, https://www.serebii.net/pokedex-xy/144.shtml
- `terminus-cave` (Zygarde Lv. 70): https://www.pokewiki.de/Omega-Höhle, https://www.serebii.net/xy/legendary.shtml
- `kalos-route-6`/`-7`/`-13`/`-18` (Raschelnde Büsche/Beerensträucher/Staubwolken → `shaking`, `other` nur noch Horden):
  https://www.pokewiki.de/Route_6_(Kalos), https://www.pokewiki.de/Route_7_(Kalos), https://www.pokewiki.de/Route_13_(Kalos),
  https://www.pokewiki.de/Route_18_(Kalos), https://www.serebii.net/pokearth/kalos/route7.shtml,
  https://www.serebii.net/pokearth/kalos/route13.shtml, https://www.serebii.net/pokearth/kalos/route18.shtml
  Abgleich aller übrigen X/Y-Orte (Routen 2–22, Städte, Höhlen) gegen PokéWiki: Horden, Angeln, Surfen und Zertrümmerer
  stimmen mit PokeAPI überein (`other` = Horden + von der Decke/vom Himmel fallende Pokémon). Tausche nicht erfasst.

## y

Wie `x` (gleiche Quellen).

## sun

- `trainers-school` (Gras auf dem Schulgelände; PokeAPI zählt es zu `alola-route-1`): https://www.pokewiki.de/Trainerschule_(Alola),
  https://www.serebii.net/pokearth/alola/route1.shtml (Abschnitt Trainer School)

## moon

Wie `sun` (gleiche Quellen).

## ultra-sun

- `trainers-school` (Gras): Quellen wie `sun`
- `aether-paradise` (Typ:Null Lv. 60, falls nicht schon am Alten Pfad von Poni erhalten): https://www.pokewiki.de/Æther-Paradies,
  https://www.pokewiki.de/Typ:Null

## ultra-moon

Wie `ultra-sun` (gleiche Quellen).

## sword

- `rolling-fields` (Zufallsbegegnungen im Gras aller Wetter → `walk`; Overworld/Fliegend/Am Boden/Beerenbaum → `other`;
  Basislevel vor Orden): https://www.pokewiki.de/Wonnewiesen, https://www.serebii.net/pokearth/galar/rollingfields.shtml
- `galar-battle-tower` (Typ:Null Lv. 50): https://www.serebii.net/pokearth/galar/battletower.shtml, https://www.pokewiki.de/Typ:Null
- `meetup-spot` (Pikachu/Evoli Lv. 10, nur mit Let's-Go-Spielstand): https://www.pokewiki.de/Naturzonen-Bahnhof,
  https://www.serebii.net/pokearth/galar/meetupspot.shtml
- DLC Rüstungsinsel und Kronen-Schneelande (alle Orte mit Pokémon, ids = PokeAPI-Slugs, Namen = Kartenlabel aus PokéWiki):
  PokeAPI-CSV (Versionen `the-isle-of-armor-sword`/`-shield`, `the-crown-tundra-sword`/`-shield`, die der Generator nicht
  einliest) https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv, abgeglichen mit Serebii
  https://www.serebii.net/pokearth/galar/fieldsofhonor.shtml (und die übrigen DLC-Seiten derselben Liste, z. B.
  https://www.serebii.net/pokearth/galar/giant'sbed.shtml, https://www.serebii.net/pokearth/galar/ballimerelake.shtml) und
  Stichproben PokéWiki https://www.pokewiki.de/Grußgefilde, https://www.pokewiki.de/Fokusforst,
  https://www.pokewiki.de/Schneeschlucht, https://www.pokewiki.de/Ballsee-Ufer.
  Methoden: Zufallsbegegnungen im Gras aller Wetter → `walk`; Overworld/Starke Pokémon/Fliegend/Am Boden/Beerenbaum →
  `other`; Pokémon auf dem Wasser → `surf`; Angeln an Wellen → `old-rod`; Diglett-Belohnungen, Dojo-Geschenke, Cosmog,
  Venicro → `gift`; Legenden (Coronospa, Polaross/Phantoross, Regis inkl. Regigigas, Kobalium/Terrakium/Viridium,
  Keldeo, Kryppuk) → `static`; Galar-Arktos/-Zapdos/-Lavados → `other` bei `roaming-crown-tundra`/
  `roaming-galar-wild-area`/`roaming-isle-of-armor`. Basislevel vor dem Liga-Sieg. Dyna-Raids, Dyna-Abenteuer und Tausche
  nicht erfasst.

## shield

Wie `sword` (gleiche Quellen, Editionsunterschiede in `rolling-fields` und den DLC-Orten).

### omega-ruby

- omega-ruby.json: Serebii (ORAS-Tabellen) https://www.serebii.net/pokearth/hoenn/aquahideout.shtml, https://www.serebii.net/pokearth/hoenn/battleresort.shtml, https://www.serebii.net/pokearth/hoenn/caveoforigin.shtml, https://www.serebii.net/pokearth/hoenn/crescentisle.shtml, https://www.serebii.net/pokearth/hoenn/evergrandecity.shtml, https://www.serebii.net/pokearth/hoenn/fabledcave.shtml, https://www.serebii.net/pokearth/hoenn/fierypath.shtml, https://www.serebii.net/pokearth/hoenn/gnarledden.shtml, https://www.serebii.net/pokearth/hoenn/granitecave.shtml, https://www.serebii.net/pokearth/hoenn/jaggedpass.shtml, https://www.serebii.net/pokearth/hoenn/lavaridgetown.shtml, https://www.serebii.net/pokearth/hoenn/lilycovecity.shtml, https://www.serebii.net/pokearth/hoenn/magmahideout.shtml, https://www.serebii.net/pokearth/hoenn/meteorfalls.shtml, https://www.serebii.net/pokearth/hoenn/miragecave.shtml, https://www.serebii.net/pokearth/hoenn/mirageforest.shtml, https://www.serebii.net/pokearth/hoenn/mirageisland.shtml, https://www.serebii.net/pokearth/hoenn/miragemountain.shtml, https://www.serebii.net/pokearth/hoenn/mossdeepcity.shtml, https://www.serebii.net/pokearth/hoenn/mt.pyre.shtml, https://www.serebii.net/pokearth/hoenn/namelesscavern.shtml, https://www.serebii.net/pokearth/hoenn/newmauville.shtml, https://www.serebii.net/pokearth/hoenn/pacifidlogtown.shtml, https://www.serebii.net/pokearth/hoenn/pathlessplain.shtml, https://www.serebii.net/pokearth/hoenn/petalburgcity.shtml, https://www.serebii.net/pokearth/hoenn/petalburgwoods.shtml, https://www.serebii.net/pokearth/hoenn/route101.shtml, https://www.serebii.net/pokearth/hoenn/route102.shtml, https://www.serebii.net/pokearth/hoenn/route103.shtml, https://www.serebii.net/pokearth/hoenn/route104.shtml, https://www.serebii.net/pokearth/hoenn/route105.shtml, https://www.serebii.net/pokearth/hoenn/route106.shtml, https://www.serebii.net/pokearth/hoenn/route107.shtml, https://www.serebii.net/pokearth/hoenn/route108.shtml, https://www.serebii.net/pokearth/hoenn/route109.shtml, https://www.serebii.net/pokearth/hoenn/route110.shtml, https://www.serebii.net/pokearth/hoenn/route111.shtml, https://www.serebii.net/pokearth/hoenn/route112.shtml, https://www.serebii.net/pokearth/hoenn/route113.shtml, https://www.serebii.net/pokearth/hoenn/route114.shtml, https://www.serebii.net/pokearth/hoenn/route115.shtml, https://www.serebii.net/pokearth/hoenn/route116.shtml, https://www.serebii.net/pokearth/hoenn/route117.shtml, https://www.serebii.net/pokearth/hoenn/route118.shtml, https://www.serebii.net/pokearth/hoenn/route119.shtml, https://www.serebii.net/pokearth/hoenn/route120.shtml, https://www.serebii.net/pokearth/hoenn/route121.shtml, https://www.serebii.net/pokearth/hoenn/route122.shtml, https://www.serebii.net/pokearth/hoenn/route123.shtml, https://www.serebii.net/pokearth/hoenn/route124.shtml, https://www.serebii.net/pokearth/hoenn/route125.shtml, https://www.serebii.net/pokearth/hoenn/route126.shtml, https://www.serebii.net/pokearth/hoenn/route127.shtml, https://www.serebii.net/pokearth/hoenn/route128.shtml, https://www.serebii.net/pokearth/hoenn/route129.shtml, https://www.serebii.net/pokearth/hoenn/route130.shtml, https://www.serebii.net/pokearth/hoenn/route131.shtml, https://www.serebii.net/pokearth/hoenn/route132.shtml, https://www.serebii.net/pokearth/hoenn/route133.shtml, https://www.serebii.net/pokearth/hoenn/route134.shtml, https://www.serebii.net/pokearth/hoenn/rustborocity.shtml, https://www.serebii.net/pokearth/hoenn/rusturftunnel.shtml, https://www.serebii.net/pokearth/hoenn/safarizone.shtml, https://www.serebii.net/pokearth/hoenn/scorchedslab.shtml, https://www.serebii.net/pokearth/hoenn/seafloorcavern.shtml, https://www.serebii.net/pokearth/hoenn/sealedchamber.shtml, https://www.serebii.net/pokearth/hoenn/seamauville.shtml, https://www.serebii.net/pokearth/hoenn/shoalcave.shtml, https://www.serebii.net/pokearth/hoenn/skypillar.shtml, https://www.serebii.net/pokearth/hoenn/slateportcity.shtml, https://www.serebii.net/pokearth/hoenn/soaringinthesky.shtml, https://www.serebii.net/pokearth/hoenn/sootopoliscity.shtml, https://www.serebii.net/pokearth/hoenn/southernisland.shtml, https://www.serebii.net/pokearth/hoenn/tracklessforest.shtml, https://www.serebii.net/pokearth/hoenn/victoryroad.shtml
  Pokémon-DB (Gen 6, Hauptquelle bei Abweichungen): https://pokemondb.net/location/hoenn-battle-resort, https://pokemondb.net/location/hoenn-cave-of-origin, https://pokemondb.net/location/hoenn-dewford-town, https://pokemondb.net/location/hoenn-evergrande-city, https://pokemondb.net/location/hoenn-fiery-path, https://pokemondb.net/location/hoenn-granite-cave, https://pokemondb.net/location/hoenn-jagged-pass, https://pokemondb.net/location/hoenn-lilycove-city, https://pokemondb.net/location/hoenn-meteor-falls, https://pokemondb.net/location/hoenn-mirage-spots, https://pokemondb.net/location/hoenn-mossdeep-city, https://pokemondb.net/location/hoenn-mt-pyre, https://pokemondb.net/location/hoenn-new-mauville, https://pokemondb.net/location/hoenn-pacifidlog-town, https://pokemondb.net/location/hoenn-petalburg-city, https://pokemondb.net/location/hoenn-petalburg-woods, https://pokemondb.net/location/hoenn-route-101, https://pokemondb.net/location/hoenn-route-102, https://pokemondb.net/location/hoenn-route-103, https://pokemondb.net/location/hoenn-route-104, https://pokemondb.net/location/hoenn-route-105, https://pokemondb.net/location/hoenn-route-106, https://pokemondb.net/location/hoenn-route-107, https://pokemondb.net/location/hoenn-route-108, https://pokemondb.net/location/hoenn-route-109, https://pokemondb.net/location/hoenn-route-110, https://pokemondb.net/location/hoenn-route-111, https://pokemondb.net/location/hoenn-route-112, https://pokemondb.net/location/hoenn-route-113, https://pokemondb.net/location/hoenn-route-114, https://pokemondb.net/location/hoenn-route-115, https://pokemondb.net/location/hoenn-route-116, https://pokemondb.net/location/hoenn-route-117, https://pokemondb.net/location/hoenn-route-118, https://pokemondb.net/location/hoenn-route-119, https://pokemondb.net/location/hoenn-route-120, https://pokemondb.net/location/hoenn-route-121, https://pokemondb.net/location/hoenn-route-122, https://pokemondb.net/location/hoenn-route-123, https://pokemondb.net/location/hoenn-route-124, https://pokemondb.net/location/hoenn-route-125, https://pokemondb.net/location/hoenn-route-126, https://pokemondb.net/location/hoenn-route-127, https://pokemondb.net/location/hoenn-route-128, https://pokemondb.net/location/hoenn-route-129, https://pokemondb.net/location/hoenn-route-130, https://pokemondb.net/location/hoenn-route-131, https://pokemondb.net/location/hoenn-route-132, https://pokemondb.net/location/hoenn-route-133, https://pokemondb.net/location/hoenn-route-134, https://pokemondb.net/location/hoenn-rustboro-city, https://pokemondb.net/location/hoenn-rusturf-tunnel, https://pokemondb.net/location/hoenn-safari-zone, https://pokemondb.net/location/hoenn-scorched-slab, https://pokemondb.net/location/hoenn-sea-mauville, https://pokemondb.net/location/hoenn-seafloor-cavern, https://pokemondb.net/location/hoenn-shoal-cave, https://pokemondb.net/location/hoenn-sky-pillar, https://pokemondb.net/location/hoenn-slateport-city, https://pokemondb.net/location/hoenn-sootopolis-city, https://pokemondb.net/location/hoenn-southern-island, https://pokemondb.net/location/hoenn-team-magma-aqua-hideout, https://pokemondb.net/location/hoenn-victory-road
  PokéWiki (Stichproben/Schiedsrichter): https://www.pokewiki.de/Route_101_(Hoenn), https://www.pokewiki.de/Route_105_(Hoenn), https://www.pokewiki.de/Route_110_(Hoenn), https://www.pokewiki.de/Route_111_(Hoenn), https://www.pokewiki.de/Route_119_(Hoenn), https://www.pokewiki.de/Route_120_(Hoenn), https://www.pokewiki.de/Route_124_(Hoenn), https://www.pokewiki.de/Route_134_(Hoenn), https://www.pokewiki.de/Blütenburg_City, https://www.pokewiki.de/Faustauhaven, https://www.pokewiki.de/Feuriger_Pfad, https://www.pokewiki.de/Floßbrunn, https://www.pokewiki.de/Granithöhle, https://www.pokewiki.de/Metaflurtunnel, https://www.pokewiki.de/Metarost_City, https://www.pokewiki.de/Meteorfälle, https://www.pokewiki.de/Moosbach_City, https://www.pokewiki.de/Prachtpolis_City, https://www.pokewiki.de/Seegrasulb_City, https://www.pokewiki.de/Team_Aquas_Versteck, https://www.pokewiki.de/Tiefseehöhle, https://www.pokewiki.de/Xeneroville, https://www.pokewiki.de/Küstenhöhle, https://www.pokewiki.de/Schiffswrack
  Methoden: Gras/Höhle → `walk`, langes Gras (Route 118–123, Safari-Zone) → `dark-grass`, Horden + DexNavi-exklusive + Seegras (Taucher) → `other`, Luftraum-Wolken → `shaking`, Barschwa-Felder → `fishing-spots`, Fossilien (Devon) → `gift`, Legenden/Kecleon/Lektrobal → `static`. Tausche nicht erfasst. Regice/Regigigas → `island-cave`, Registeel → `ancient-tomb`, Regirock → `desert-ruins`.

### alpha-sapphire

- alpha-sapphire.json: Serebii (ORAS-Tabellen) https://www.serebii.net/pokearth/hoenn/aquahideout.shtml, https://www.serebii.net/pokearth/hoenn/battleresort.shtml, https://www.serebii.net/pokearth/hoenn/caveoforigin.shtml, https://www.serebii.net/pokearth/hoenn/crescentisle.shtml, https://www.serebii.net/pokearth/hoenn/evergrandecity.shtml, https://www.serebii.net/pokearth/hoenn/fabledcave.shtml, https://www.serebii.net/pokearth/hoenn/fierypath.shtml, https://www.serebii.net/pokearth/hoenn/gnarledden.shtml, https://www.serebii.net/pokearth/hoenn/granitecave.shtml, https://www.serebii.net/pokearth/hoenn/jaggedpass.shtml, https://www.serebii.net/pokearth/hoenn/lavaridgetown.shtml, https://www.serebii.net/pokearth/hoenn/lilycovecity.shtml, https://www.serebii.net/pokearth/hoenn/magmahideout.shtml, https://www.serebii.net/pokearth/hoenn/meteorfalls.shtml, https://www.serebii.net/pokearth/hoenn/miragecave.shtml, https://www.serebii.net/pokearth/hoenn/mirageforest.shtml, https://www.serebii.net/pokearth/hoenn/mirageisland.shtml, https://www.serebii.net/pokearth/hoenn/miragemountain.shtml, https://www.serebii.net/pokearth/hoenn/mossdeepcity.shtml, https://www.serebii.net/pokearth/hoenn/mt.pyre.shtml, https://www.serebii.net/pokearth/hoenn/namelesscavern.shtml, https://www.serebii.net/pokearth/hoenn/newmauville.shtml, https://www.serebii.net/pokearth/hoenn/pacifidlogtown.shtml, https://www.serebii.net/pokearth/hoenn/pathlessplain.shtml, https://www.serebii.net/pokearth/hoenn/petalburgcity.shtml, https://www.serebii.net/pokearth/hoenn/petalburgwoods.shtml, https://www.serebii.net/pokearth/hoenn/route101.shtml, https://www.serebii.net/pokearth/hoenn/route102.shtml, https://www.serebii.net/pokearth/hoenn/route103.shtml, https://www.serebii.net/pokearth/hoenn/route104.shtml, https://www.serebii.net/pokearth/hoenn/route105.shtml, https://www.serebii.net/pokearth/hoenn/route106.shtml, https://www.serebii.net/pokearth/hoenn/route107.shtml, https://www.serebii.net/pokearth/hoenn/route108.shtml, https://www.serebii.net/pokearth/hoenn/route109.shtml, https://www.serebii.net/pokearth/hoenn/route110.shtml, https://www.serebii.net/pokearth/hoenn/route111.shtml, https://www.serebii.net/pokearth/hoenn/route112.shtml, https://www.serebii.net/pokearth/hoenn/route113.shtml, https://www.serebii.net/pokearth/hoenn/route114.shtml, https://www.serebii.net/pokearth/hoenn/route115.shtml, https://www.serebii.net/pokearth/hoenn/route116.shtml, https://www.serebii.net/pokearth/hoenn/route117.shtml, https://www.serebii.net/pokearth/hoenn/route118.shtml, https://www.serebii.net/pokearth/hoenn/route119.shtml, https://www.serebii.net/pokearth/hoenn/route120.shtml, https://www.serebii.net/pokearth/hoenn/route121.shtml, https://www.serebii.net/pokearth/hoenn/route122.shtml, https://www.serebii.net/pokearth/hoenn/route123.shtml, https://www.serebii.net/pokearth/hoenn/route124.shtml, https://www.serebii.net/pokearth/hoenn/route125.shtml, https://www.serebii.net/pokearth/hoenn/route126.shtml, https://www.serebii.net/pokearth/hoenn/route127.shtml, https://www.serebii.net/pokearth/hoenn/route128.shtml, https://www.serebii.net/pokearth/hoenn/route129.shtml, https://www.serebii.net/pokearth/hoenn/route130.shtml, https://www.serebii.net/pokearth/hoenn/route131.shtml, https://www.serebii.net/pokearth/hoenn/route132.shtml, https://www.serebii.net/pokearth/hoenn/route133.shtml, https://www.serebii.net/pokearth/hoenn/route134.shtml, https://www.serebii.net/pokearth/hoenn/rustborocity.shtml, https://www.serebii.net/pokearth/hoenn/rusturftunnel.shtml, https://www.serebii.net/pokearth/hoenn/safarizone.shtml, https://www.serebii.net/pokearth/hoenn/scorchedslab.shtml, https://www.serebii.net/pokearth/hoenn/seafloorcavern.shtml, https://www.serebii.net/pokearth/hoenn/sealedchamber.shtml, https://www.serebii.net/pokearth/hoenn/seamauville.shtml, https://www.serebii.net/pokearth/hoenn/shoalcave.shtml, https://www.serebii.net/pokearth/hoenn/skypillar.shtml, https://www.serebii.net/pokearth/hoenn/slateportcity.shtml, https://www.serebii.net/pokearth/hoenn/soaringinthesky.shtml, https://www.serebii.net/pokearth/hoenn/sootopoliscity.shtml, https://www.serebii.net/pokearth/hoenn/southernisland.shtml, https://www.serebii.net/pokearth/hoenn/tracklessforest.shtml, https://www.serebii.net/pokearth/hoenn/victoryroad.shtml
  Pokémon-DB (Gen 6, Hauptquelle bei Abweichungen): https://pokemondb.net/location/hoenn-battle-resort, https://pokemondb.net/location/hoenn-cave-of-origin, https://pokemondb.net/location/hoenn-dewford-town, https://pokemondb.net/location/hoenn-evergrande-city, https://pokemondb.net/location/hoenn-fiery-path, https://pokemondb.net/location/hoenn-granite-cave, https://pokemondb.net/location/hoenn-jagged-pass, https://pokemondb.net/location/hoenn-lilycove-city, https://pokemondb.net/location/hoenn-meteor-falls, https://pokemondb.net/location/hoenn-mirage-spots, https://pokemondb.net/location/hoenn-mossdeep-city, https://pokemondb.net/location/hoenn-mt-pyre, https://pokemondb.net/location/hoenn-new-mauville, https://pokemondb.net/location/hoenn-pacifidlog-town, https://pokemondb.net/location/hoenn-petalburg-city, https://pokemondb.net/location/hoenn-petalburg-woods, https://pokemondb.net/location/hoenn-route-101, https://pokemondb.net/location/hoenn-route-102, https://pokemondb.net/location/hoenn-route-103, https://pokemondb.net/location/hoenn-route-104, https://pokemondb.net/location/hoenn-route-105, https://pokemondb.net/location/hoenn-route-106, https://pokemondb.net/location/hoenn-route-107, https://pokemondb.net/location/hoenn-route-108, https://pokemondb.net/location/hoenn-route-109, https://pokemondb.net/location/hoenn-route-110, https://pokemondb.net/location/hoenn-route-111, https://pokemondb.net/location/hoenn-route-112, https://pokemondb.net/location/hoenn-route-113, https://pokemondb.net/location/hoenn-route-114, https://pokemondb.net/location/hoenn-route-115, https://pokemondb.net/location/hoenn-route-116, https://pokemondb.net/location/hoenn-route-117, https://pokemondb.net/location/hoenn-route-118, https://pokemondb.net/location/hoenn-route-119, https://pokemondb.net/location/hoenn-route-120, https://pokemondb.net/location/hoenn-route-121, https://pokemondb.net/location/hoenn-route-122, https://pokemondb.net/location/hoenn-route-123, https://pokemondb.net/location/hoenn-route-124, https://pokemondb.net/location/hoenn-route-125, https://pokemondb.net/location/hoenn-route-126, https://pokemondb.net/location/hoenn-route-127, https://pokemondb.net/location/hoenn-route-128, https://pokemondb.net/location/hoenn-route-129, https://pokemondb.net/location/hoenn-route-130, https://pokemondb.net/location/hoenn-route-131, https://pokemondb.net/location/hoenn-route-132, https://pokemondb.net/location/hoenn-route-133, https://pokemondb.net/location/hoenn-route-134, https://pokemondb.net/location/hoenn-rustboro-city, https://pokemondb.net/location/hoenn-rusturf-tunnel, https://pokemondb.net/location/hoenn-safari-zone, https://pokemondb.net/location/hoenn-scorched-slab, https://pokemondb.net/location/hoenn-sea-mauville, https://pokemondb.net/location/hoenn-seafloor-cavern, https://pokemondb.net/location/hoenn-shoal-cave, https://pokemondb.net/location/hoenn-sky-pillar, https://pokemondb.net/location/hoenn-slateport-city, https://pokemondb.net/location/hoenn-sootopolis-city, https://pokemondb.net/location/hoenn-southern-island, https://pokemondb.net/location/hoenn-team-magma-aqua-hideout, https://pokemondb.net/location/hoenn-victory-road
  PokéWiki (Stichproben/Schiedsrichter): https://www.pokewiki.de/Route_101_(Hoenn), https://www.pokewiki.de/Route_105_(Hoenn), https://www.pokewiki.de/Route_110_(Hoenn), https://www.pokewiki.de/Route_111_(Hoenn), https://www.pokewiki.de/Route_119_(Hoenn), https://www.pokewiki.de/Route_120_(Hoenn), https://www.pokewiki.de/Route_124_(Hoenn), https://www.pokewiki.de/Route_134_(Hoenn), https://www.pokewiki.de/Blütenburg_City, https://www.pokewiki.de/Faustauhaven, https://www.pokewiki.de/Feuriger_Pfad, https://www.pokewiki.de/Floßbrunn, https://www.pokewiki.de/Granithöhle, https://www.pokewiki.de/Metaflurtunnel, https://www.pokewiki.de/Metarost_City, https://www.pokewiki.de/Meteorfälle, https://www.pokewiki.de/Moosbach_City, https://www.pokewiki.de/Prachtpolis_City, https://www.pokewiki.de/Seegrasulb_City, https://www.pokewiki.de/Team_Aquas_Versteck, https://www.pokewiki.de/Tiefseehöhle, https://www.pokewiki.de/Xeneroville, https://www.pokewiki.de/Küstenhöhle, https://www.pokewiki.de/Schiffswrack
  Methoden: Gras/Höhle → `walk`, langes Gras (Route 118–123, Safari-Zone) → `dark-grass`, Horden + DexNavi-exklusive + Seegras (Taucher) → `other`, Luftraum-Wolken → `shaking`, Barschwa-Felder → `fishing-spots`, Fossilien (Devon) → `gift`, Legenden/Kecleon/Lektrobal → `static`. Tausche nicht erfasst. Regice/Regigigas → `island-cave`, Registeel → `ancient-tomb`, Regirock → `desert-ruins`.

## scarlet

Pokémon Karmesin (PokeAPI hat für Karmesin/Purpur keine Encounter). Erzeugt mit einem Hilfsskript aus:

- PokéWiki-Kartendaten (Spieldaten: Spawn-Tabellen, Spawnpunkte mit Level/Biom/Gebiet, feste Spawns, Teilgebiets-Volumen),
  ausgewertet mit derselben `canSpawn`-Logik wie die Karten der Seite (Level-Überlappung, Gebiet, Land/Wasser, Biom,
  Teilgebiet); Level = Schnitt aus Art- und Spawnpunkt-Level:
  https://www.pokewiki.de/Spezial:Paldea-Karte/Südliche_Zone_1 (Daten: https://www.pokewiki.de/extensions/PwMapPaldea/data/pokemon.php?area=N,
  `spawner.php?area=N`, `static.json`, `locations/<volumen>.json`; analog `PwMapKitakami` und `PwMapTerrarium` für
  https://www.pokewiki.de/Spezial:Kitakami-Karte/Kitakami-Straße und https://www.pokewiki.de/Spezial:Tera-Kuppel-Karte/Küsten-Areal)
- PokéWiki-Ortsartikel (`{{Orte Pokémon/Zeile}}`): Zone Null (wilde Pokémon inkl. Paradox, Kristallhöhle), Herrscher,
  Schreine, Snack-Legenden, Starter, Geschenke, z. B. https://www.pokewiki.de/Zone_Null, https://www.pokewiki.de/Mesclores-Passage,
  https://www.pokewiki.de/Meeresbuchthöhle, https://www.pokewiki.de/Cucharico, https://www.pokewiki.de/Schrein_der_unreinen_Erde
- Serebii Pokéarth (Artenlisten der Höhlen/Teilgebiete, Stichproben):
  https://www.serebii.net/pokearth/paldea/ (z. B. `inletgrotto.shtml`, `alfornadacavern.shtml`, `dalizapapassage.shtml`,
  `socarrattrail.shtml`, `pocopath.shtml`, `southprovinceareaone.shtml`, `casseroyalake.shtml`, `glaseadomountain.shtml`),
  https://www.serebii.net/pokearth/kitakami/ (`timelesswoods`, `kitakamihall`, `chillingwaterhead`, `infernalpass`, `oni'smaw`),
  https://www.serebii.net/pokearth/terarium/ (`chargestonecavern`, `torchlitlabyrinth`)
- Serebii Legendäre (Level von Koraidon/Miraidon, Ogerpon, Gefolgstreue Gefährten, Terapagos, Infamomo, Meloetta):
  https://www.serebii.net/scarletviolet/legendary.shtml, https://www.serebii.net/scarletviolet/thebloodmoonbeast.shtml

Methoden: Spawns an Land → `walk`, auf dem Wasser → `surf`; feste Overworld-Spawns (inkl. fester Tera-Pokémon,
keine Tera-Raids), Herrscher nach dem Sieg, Legendäre, Paradox-Sonderbegegnungen und Snack-Legenden → `static`;
Starter, Eier und Geschenke → `gift`. Tera-Raids, Massenausbrüche und Tausche nicht erfasst; Story-Kämpfe ohne Fang
ausgelassen. Zonen, Meere, Seen, Montanata (Gebiete 17+19), Oniyama (4+5) und die Areale enthalten alle Spawns ihres
Gebiets (wie auf PokéWiki), Höhlen/Teilgebiete darin (Meeresbuchthöhle, Cucharico-Pfad, Asarilla-Grotte,
Mesclores-Passage, Knusperwaldweg, Immerwald, Kitakami-Kulturzentrum, Kaltwasserkarst, Infernopass, Rachen des Oni,
Elektrolithgrotte, Fackellabyrinth) zusätzlich mit den Arten laut Serebii/PokéWiki-Artikel und den Leveln der
Spawnpunkte im Spielvolumen (sonst des umgebenden Gebiets). Kitakami/Blaubeer: Basislevel vor der Anhebung nach der
Story. Städte, Akademien, Team-Star-Verstecke und Plätze ohne eigene Spawn-Liste fehlen.

## violet

Pokémon Purpur: dieselben Quellen, dasselbe Skript und dieselbe Methoden-Zuordnung wie `scarlet`; Editionsexklusive
laut den Editions-Flags der Spawn-Tabellen bzw. `{{sk|KA}}`/`{{sk|PU}}` der PokéWiki-Artikel.
