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
- Pro Run: Name, Spiel/Generation, optional Seed und Notiz
- Die Generation bestimmt die verfügbaren Pokémon (Dex bis Gen X) und die Typenliste
  (Fee erst ab Gen 6, Unlicht/Stahl erst ab Gen 2)

### Kategorien (pro Run togglebar)

| Kategorie | Eingabe |
| --- | --- |
| Typen | 1–2 Typen |
| Attacken | Level-Up-Attacken (Level + Attacke), optional TM/HM |
| Stats | KP, Angriff, Verteidigung, Sp.-Angr., Sp.-Vert., Init. (Summe automatisch) |
| Fähigkeiten | 1–3 Fähigkeiten |
| Entwicklungen | Ziel-Pokémon + Methode (Level, Item, frei als Text) |
| Fundorte | Route/Ort, wo das Pokémon wild vorkommt |
| Notiz | Freitext pro Pokémon |

Deaktivierte Kategorien werden ausgeblendet, eingetragene Daten bleiben beim Deaktivieren
erhalten (kein Datenverlust durch versehentliches Toggeln).

### Pokémon-Liste

- Linke Spalte: alle Pokémon der Generation (Dex-Nr., Name, Sprite)
- Unscharfe Suche nach Name/Nummer, Filter „nur eingetragene“ / „nur fehlende“
- Filter nach eingetragenem Typ (z. B. alle Pokémon, die im Run jetzt Feuer sind)
- Rechts: Detailansicht mit den aktiven Kategorien zum Bearbeiten
- Tastatur: `↑` `↓` durch die Liste, Tippen fokussiert die Suche

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
