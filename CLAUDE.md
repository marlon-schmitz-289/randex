# Randex

Projektbeschreibung, Funktionen und Nicht-Ziele: `README.md`. Stack und Aufbau orientieren sich an
`../open-claude`; bei Unklarheiten dort nachsehen, wie es gelöst ist.

## Code

- Sauber und schlicht: keine toten Pfade, kein auskommentierter Code, keine Abstraktion auf Vorrat.
- **Null Warnungen.** `svelte-check`, `cargo clippy -- -D warnings`, Browser-Konsole und Build-Output
  bleiben leer. Warnungen werden behoben, nicht unterdrückt (`#[allow]`, `svelte-ignore`,
  `@ts-ignore` nur mit Begründung im Kommentar).
- TypeScript strikt, kein `any`. Rust: `Result` statt `unwrap()`/`expect()` außerhalb von Tests.
- Neue Dependencies nur, wenn sie deutlich mehr als ein paar Zeilen sparen. Erst prüfen, ob
  Stdlib, Plattform oder vorhandene Pakete es schon können.
- Immer die aktuellen Versionen und Schreibweisen:
  - Svelte 5 Runes (`$state`, `$derived`, `$effect`, `$props`), Snippets statt Slots,
    `onclick` statt `on:click`. Keine Svelte-4-Syntax, keine `writable`-Stores für neuen Code.
  - SvelteKit 2 mit `adapter-static`, Tailwind v4 (CSS-first, `@theme`, keine `tailwind.config.js`).
  - shadcn-svelte in der aktuellen Version (bits-ui), Komponenten per CLI hinzufügen, nicht
    selbst nachbauen. Icons aus `@lucide/svelte`.
  - Tauri v2 (Capabilities/Permissions, Plugins v2).
  - Im Zweifel die aktuelle Doku lesen statt aus dem Gedächtnis schreiben.

## Performance

- Die Liste hat bis zu ~1000 Pokémon: Filter/Suche mit `$derived`, keine Arbeit pro Tastendruck,
  die nicht nötig ist. Lange Listen virtualisieren, wenn es ruckelt.
- Stammdaten einmal laden und im Speicher halten; kein wiederholtes Parsen von JSON.
- Sprites lazy laden (`loading="lazy"`), feste Größen gegen Layout-Sprünge.
- Speichern entprellt, nicht bei jedem Tastendruck auf die Platte.
- Kein Netzwerk zur Laufzeit.

## UI

- Professionell und aufgeräumt, optisch angelehnt an die Spiele **Pokémon Schwarze Edition / Weiße Edition** (Gen 5, DS):
  - Monochrome Basis (Schwarz, Anthrazit, Weiß) mit kühlen Akzenten (Cyan/Blau wie im
    C-Gear und Pokédex der Spiele), sparsam eingesetzt.
  - Klare, abgerundete Panels mit hellem Rahmen auf dunklem Grund, wie die Menüs im Spiel (Beutel, Pokémon-Bericht, PC-Boxen).
  - Typfarben im Stil der offiziellen Typ-Badges.
  - Hell- und Dunkelmodus, beide stimmig.
- Keine Pixel-Schriften für Fließtext, Lesbarkeit geht vor Nostalgie.
- Farben nur über Theme-Variablen (`@theme` / shadcn-Tokens), keine Hex-Werte in Komponenten.
- Alles per Tastatur bedienbar, sichtbarer Fokus, ausreichender Kontrast.
- UI-Texte auf Deutsch.

## Ablauf bei Änderungen

1. Vor dem Schreiben den betroffenen Code lesen; vorhandene Helfer und Komponenten wiederverwenden.
2. Nach Änderungen: `npm run check`, bei Rust zusätzlich
   `(cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo test)`. Alles grün, keine
   Warnungen, bevor etwas als fertig gilt.
3. UI-Änderungen in der laufenden App ansehen (`npm run tauri dev`), nicht nur kompilieren.
4. Committen mit dem `commit`-Skill, danach bei Rust-Builds `cleanup`.
