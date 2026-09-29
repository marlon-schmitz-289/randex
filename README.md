# Randex

Desktop-Tracker für Pokémon-Randomizer-Runs. Statt Notizen in Textdateien trägt man pro Run ein,
was der Randomizer bei jedem Pokémon geändert hat — Typen, Attacken, Stats usw. — und schlägt es
später schnell nach.

Tauri v2 (Rust) + SvelteKit + shadcn-svelte.

## Idee

Ein Randomizer (z. B. Universal Pokémon Randomizer ZX) würfelt je nach Einstellung unterschiedliche
Dinge. Randex bildet genau das ab: pro Run wird festgelegt, **welche Kategorien randomisiert sind**,
und nur diese erscheinen in der Eingabe und Anzeige. Alles andere bleibt ausgeblendet.

Aktueller eigener Anwendungsfall: nur **Typen** und **Attacken** randomisiert.

## Funktionen

### Runs

- Mehrere Runs anlegen, umbenennen, löschen, zwischen ihnen wechseln
- Pro Run: Name, Spiel (z. B. Schwarz 2, Feuerrot), optional Seed und Notiz
- Das Spiel bestimmt die Generation und damit die verfügbaren Pokémon (Nationaldex bis Gen X),
  Typen (Fee erst ab Gen 6, Unlicht/Stahl erst ab Gen 2), Attacken, Fähigkeiten (ab Gen 3) und Routen
- Einstellung „Wilde Pokémon“ wie im Randomizer: keine Zuordnung, Area 1:1 oder Global 1:1

### Kategorien (pro Run togglebar)

| Kategorie | Eingabe |
| --- | --- |
| Typen | 1–2 Typen |
| Attacken | Level-Up-Attacken (Level + Attacke), optional TM/HM |
| Stats | KP, Angriff, Verteidigung, Sp.-Angr., Sp.-Vert., Init. (Summe automatisch) |
| Fähigkeiten | 1–3 Fähigkeiten |
| Entwicklungen | Ziel-Pokémon + Methode (Level, Item, frei als Text) |
| Fundorte | automatisch aus den Encounter-Listen der Routen, Klick springt zur Route |
| Notiz | Freitext pro Pokémon |

Deaktivierte Kategorien werden ausgeblendet, eingetragene Daten bleiben beim Deaktivieren
erhalten (kein Datenverlust durch versehentliches Toggeln).

### Pokémon-Liste

- Linke Spalte: alle Pokémon der Generation (Dex-Nr., Name, Sprite)
- Unscharfe Suche nach Name/Nummer, Filter „nur eingetragene“ / „nur fehlende“
- Filter nach eingetragenem Typ (z. B. alle Pokémon, die im Run jetzt Feuer sind)
- Rechts: Detailansicht mit den aktiven Kategorien zum Bearbeiten
- Tastatur: `↑` `↓` durch die Liste, Tippen fokussiert die Suche

### Routen und Karte

- Pro Route und Methode (Gras, Surfen, Angeln …) eintragen, welche Pokémon dort vorkommen
- Schematische Regionskarte aller Regionen, Klick auf Route/Ort öffnet die Encounter-Liste;
  alternativ als durchsuchbare Liste, eigene Routen per Freitext
- Bei Area-/Global-1:1 steht pro Methode der Stand, z. B. „Gras (2/3)“ (Slots = verschiedene
  Original-Pokémon)

### Fortschritt

- Aktuelles Team (bis 6 Pokémon, Spitzname, Level)
- Orden bzw. Prüfungen, Titanen usw. des Spiels zum Abhaken

### Daten

- Stammdaten (Pokémon-Namen, Dex-Nr., Sprites, Attacken-, Fähigkeiten-, Typenlisten) werden
  **einmalig** z. B. aus PokeAPI per Script erzeugt und als statisches JSON mitgeliefert —
  keine Netzwerkzugriffe zur Laufzeit
- Namen auf **Deutsch** (PokeAPI liefert deutsche Namen)
- Attacken/Fähigkeiten per Autocomplete aus diesen Listen, Freitext als Fallback
  (Randomizer können Custom-Sachen haben)
- Run-Daten lokal als JSON (eine Datei pro Run im App-Data-Ordner, oder `tauri-plugin-store`)
- Export/Import eines Runs als JSON

## Nicht-Ziele

- Kein Parsen von ROMs oder Randomizer-Logs (evtl. später: Import der `.log`-Datei des UPR ZX)
- Kein Online-Sync, keine Accounts
- Kein Schadensrechner

## Entwicklung

```sh
npm install
npm run tauri dev
```

Stammdaten (Pokémon, Attacken, Orte, Sprites) neu erzeugen:

```sh
node scripts/generate-data.mjs
```

Build:

```sh
npm run tauri build
```

## Konventionen

- Stack und Aufbau wie `../open-claude` (Tauri v2, SvelteKit mit `adapter-static`, Svelte 5,
  Tailwind v4, shadcn-svelte, `@lucide/svelte`)
- UI-Texte auf Deutsch
- Commits: kein `Co-Authored-By` oder sonstige Signaturen/Footer. Titelzeile ≤ 50 Zeichen,
  danach Stichpunkte
