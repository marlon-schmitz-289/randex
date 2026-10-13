<script lang="ts">
  import { app } from "$lib/runs.svelte.ts";
  import { loadRegionMap } from "$lib/data.ts";
  import { countSpecies } from "$lib/encounters.ts";
  import type { MapPlace, RegionMap } from "$lib/types.ts";
  import type { Attachment } from "svelte/attachments";
  import { tick } from "svelte";
  import { EmptyState, IconButton, Panel } from "$lib/components/kit";
  import ZoomIn from "@lucide/svelte/icons/zoom-in";
  import ZoomOut from "@lucide/svelte/icons/zoom-out";
  import Maximize from "@lucide/svelte/icons/maximize";
  import Footprints from "@lucide/svelte/icons/footprints";
  import { Button } from "$lib/components/ui/button/index.js";


  const region = $derived(app.data?.game.region ?? "");
  const gameId = $derived(app.data?.game.id ?? "");
  const mapPromise = $derived(region ? loadRegionMap(region) : null);

  const PAD = 30;

  const count = (id: string) => countSpecies(app.encounters, id);
  const pts = (points: [number, number][]) => points.map(([x, y]) => `${x},${y}`).join(" ");
  const isDeco = (p: MapPlace) => p.id.startsWith("deco-");
  // Städte zuletzt, damit ihre Labels nicht überdeckt werden
  const order = (p: MapPlace) => (p.points.length > 1 ? 0 : p.kind === "city" ? 2 : 1);

  function hint(p: MapPlace, n: number): string {
    if (isDeco(p)) return "keine wilden Pokémon";
    if (app.original) {
      return n ? `${n} Pokémon` : "keine wilden Pokémon";
    }
    return n ? `${n} Pokémon eingetragen` : "noch nichts eingetragen";
  }

  // fixed, damit weder Panel noch Fenster den Tooltip abschneiden
  let tip = $state<{ title: string; hint: string; x: number; y: number; below: boolean } | null>(null);
  let tipWidth = $state(0);
  const EDGE = 8;
  const tipLeft = $derived(tip ? Math.min(Math.max(tip.x - tipWidth / 2, EDGE), window.innerWidth - tipWidth - EDGE) : 0);

  function showTip(el: EventTarget | null, p: MapPlace, text: string) {
    if (!(el instanceof Element)) return;
    const r = el.getBoundingClientRect();
    const below = r.top < 64;
    tip = { title: p.label, hint: text, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below };
  }

  // Zoom/Pan über die viewBox; gilt nur für die Region, in der er gesetzt wurde
  const MAX_ZOOM = 8;
  type View = { region: string; x: number; y: number; w: number };
  let view = $state<View | null>(null);
  // Während einer Geste nur CSS-transform (GPU-Ebene); eine neue viewBox rastert die ganze Karte neu
  let live: View | null = null;
  let liveSince = 0;
  let idle = 0;
  let clip = $state<HTMLDivElement>();
  let svgEl = $state<SVGSVGElement>();
  // Pro Geste einmal messen, nicht pro Event
  let rect: DOMRect | null = null;
  let dragged = false;

  const full = (map: RegionMap) => ({ x: -PAD, y: -PAD, w: map.width + 2 * PAD, h: map.height + 2 * PAD });

  function boxOf(map: RegionMap, v: View | null) {
    const f = full(map);
    if (v?.region !== region) return f;
    return { x: v.x, y: v.y, w: v.w, h: (v.w * f.h) / f.w };
  }

  const box = (map: RegionMap) => boxOf(map, live ?? view);

  /** Bildschirmpixel pro Karteneinheit für die Box b und Rand durch preserveAspectRatio (für alle Boxen gleich) */
  function fit(map: RegionMap, b: { w: number }) {
    rect ??= clip?.getBoundingClientRect() ?? new DOMRect();
    const f = full(map);
    const kf = Math.min(rect.width / f.w, rect.height / f.h);
    return { rect, k: (kf * f.w) / b.w, ox: (rect.width - f.w * kf) / 2, oy: (rect.height - f.h * kf) / 2 };
  }

  /** Zoomt um factor, der Punkt (px, py) in Kartenkoordinaten bleibt dabei stehen. */
  function zoomAt(map: RegionMap, factor: number, px: number, py: number) {
    const f = full(map);
    const b = box(map);
    const w = Math.min(f.w, Math.max(f.w / MAX_ZOOM, b.w / factor));
    const k = w / b.w;
    setView(map, px - (px - b.x) * k, py - (py - b.y) * k, w);
  }

  function setView(map: RegionMap, x: number, y: number, w: number) {
    const f = full(map);
    const h = (w * f.h) / f.w;
    const now = performance.now();
    if (!live) liveSince = now;
    live = {
      region,
      x: Math.min(Math.max(x, f.x), f.x + f.w - w),
      y: Math.min(Math.max(y, f.y), f.y + f.h - h),
      w,
    };
    clearTimeout(idle);
    // Lange Gesten zwischendurch scharf rendern, damit beim Verschieben keine leeren Ränder bleiben
    if (now - liveSince > 250) return commit();
    idle = window.setTimeout(commit, 120);
    if (!svgEl) return;
    const b0 = boxOf(map, view);
    const b = boxOf(map, live);
    const { k, ox, oy } = fit(map, b);
    const s = b0.w / b.w;
    svgEl.style.transform = `translate(${ox * (1 - s) + (b0.x - b.x) * k}px, ${oy * (1 - s) + (b0.y - b.y) * k}px) scale(${s})`;
  }

  /** Übernimmt die laufende Geste in die viewBox; Svelte setzt sie vor dem nächsten Frame. */
  function commit() {
    clearTimeout(idle);
    if (live) view = live;
    live = null;
    rect = null;
    if (svgEl) svgEl.style.transform = "";
  }

  function zoomCenter(map: RegionMap, factor: number) {
    const b = box(map);
    zoomAt(map, factor, b.x + b.w / 2, b.y + b.h / 2);
    commit();
  }

  function toMap(map: RegionMap, clientX: number, clientY: number) {
    const b = box(map);
    const { rect, k, ox, oy } = fit(map, b);
    return { x: b.x + (clientX - rect.left - ox) / k, y: b.y + (clientY - rect.top - oy) / k };
  }

  // Labels mindestens 11 Bildschirm-px, sonst sind sie in der Gesamtansicht breiter Karten unlesbar
  let clipW = $state(0);
  let clipH = $state(0);
  function labelSize(map: RegionMap, b: { w: number }) {
    const f = full(map);
    const k = (Math.min(clipW / f.w, clipH / f.h) * f.w) / b.w;
    return k ? Math.max(14, 11 / k) : 14;
  }

  /** Kartenkoordinaten pro Bildschirmpixel */
  const unit = (map: RegionMap) => 1 / fit(map, box(map)).k;

  /**
   * Trackpad: Pinch kommt in Chromium/WebKitGTK als wheel mit ctrlKey, in WKWebView (macOS) als
   * gesture*-Events; Zwei-Finger-Scrollen verschiebt. Nicht passiv, sonst greift preventDefault nicht.
   */
  const gestures =
    (map: RegionMap): Attachment<SVGSVGElement> =>
    (svg) => {
      let lastScale = 1;
      const onwheel = (e: WheelEvent) => {
        e.preventDefault();
        tip = null;
        if (e.ctrlKey) {
          const p = toMap(map, e.clientX, e.clientY);
          zoomAt(map, Math.exp(-e.deltaY * 0.01), p.x, p.y);
        } else {
          const b = box(map);
          const u = unit(map);
          setView(map, b.x + e.deltaX * u, b.y + e.deltaY * u, b.w);
        }
      };
      // GestureEvent ist WebKit-spezifisch und fehlt in lib.dom
      const ongesture = (e: Event) => {
        e.preventDefault();
        if (!(e instanceof UIEvent) || !("scale" in e) || typeof e.scale !== "number") return;
        if (e.type === "gesturestart") lastScale = 1;
        const b = box(map);
        const p = "clientX" in e && "clientY" in e ? toMap(map, Number(e.clientX), Number(e.clientY)) : { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        zoomAt(map, e.scale / lastScale, p.x, p.y);
        lastScale = e.scale;
        tip = null;
      };
      svg.addEventListener("wheel", onwheel, { passive: false });
      for (const t of ["gesturestart", "gesturechange"]) svg.addEventListener(t, ongesture);
      return () => {
        svg.removeEventListener("wheel", onwheel);
        for (const t of ["gesturestart", "gesturechange"]) svg.removeEventListener(t, ongesture);
      };
    };

  let drag: { id: number; x: number; y: number } | null = null;

  function onpointerdown(e: PointerEvent) {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    dragged = false;
  }

  function onpointermove(e: PointerEvent, map: RegionMap) {
    if (!drag || drag.id !== e.pointerId || !(e.currentTarget instanceof SVGSVGElement)) return;
    // Außerhalb losgelassen, bevor das Ziehen per Capture gebunden war
    if (!(e.buttons & 1)) {
      drag = null;
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    // Erst ab ein paar Pixeln ziehen, damit Klicks auf Orte Klicks bleiben
    if (!dragged && Math.hypot(dx, dy) < 4) return;
    if (!dragged) e.currentTarget.setPointerCapture(e.pointerId);
    dragged = true;
    tip = null;
    const b = box(map);
    const u = unit(map);
    setView(map, b.x - dx * u, b.y - dy * u, b.w);
    drag = { ...drag, x: e.clientX, y: e.clientY };
  }

  /** Tastaturfokus: Ort in den Ausschnitt holen, sonst bleiben Fokusring und Tooltip unsichtbar bzw. außerhalb */
  async function onfocus(e: FocusEvent, map: RegionMap, p: MapPlace, text: string) {
    const target = e.currentTarget;
    const xs = p.points.map(([x]) => x);
    const ys = p.points.map(([, y]) => y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const b = box(map);
    if (x0 < b.x || x1 > b.x + b.w || y0 < b.y || y1 > b.y + b.h) {
      setView(map, (x0 + x1 - b.w) / 2, (y0 + y1 - b.h) / 2, b.w);
      commit();
      await tick();
    }
    if (document.activeElement === target) showTip(target, p, text);
  }

  function onkey(e: KeyboardEvent, p: MapPlace) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    app.selectedLocationId = p.id;
  }
</script>

<svelte:window
  onresize={() => {
    tip = null;
    commit();
  }}
/>

{#snippet shape(p: MapPlace)}
  {@const [x, y] = p.points[0]}
  {#if p.points.length > 1}
    <polyline points={pts(p.points)} class="hit" />
    <polyline points={pts(p.points)} class="casing" />
    <polyline points={pts(p.points)} class="road" />
  {:else if p.kind === "city"}
    <rect x={x - 15} y={y - 15} width="30" height="30" rx="5" class="hit" />
    <rect x={x - 11} y={y - 11} width="22" height="22" rx="3" class="marker" />
    <text {x} y={y + 14} dy="0.95em" text-anchor="middle" class="label">{p.label}</text>
  {:else if p.kind === "cave"}
    <circle cx={x} cy={y} r="14" class="hit" />
    <polygon points="{x},{y - 8} {x + 8},{y} {x},{y + 8} {x - 8},{y}" class="marker" />
  {:else}
    <circle cx={x} cy={y} r="14" class="hit" />
    <circle cx={x} cy={y} r="6.5" class="marker" />
  {/if}
{/snippet}

<Panel title="Karte {region}" flush bodyClass="flex flex-col">
  {#await mapPromise}
    <EmptyState>Karte wird geladen …</EmptyState>
  {:then map}
    {#if map}
      {@const inGame = map.places.filter((p) => !p.games || p.games.includes(gameId))}
      {@const places = inGame.filter((p) => p.kind !== "roaming").sort((a, b) => order(a) - order(b))}
      {@const roaming = inGame.filter((p) => p.kind === "roaming")}
      {@const b = boxOf(map, view)}
      {@const zoomed = b.w < full(map).w}
      <div class="relative min-h-0 flex-1 p-2">
        <div bind:this={clip} bind:clientWidth={clipW} bind:clientHeight={clipH} class="size-full overflow-hidden">
          <svg
            bind:this={svgEl}
            viewBox="{b.x} {b.y} {b.w} {b.h}"
            style:--label-size="{labelSize(map, b)}px"
            class={["size-full origin-top-left touch-none select-none will-change-transform", zoomed && "cursor-grab active:cursor-grabbing"]}
            role="group"
            aria-label="Karte {region}"
            {@attach gestures(map)}
            {onpointerdown}
            onpointermove={(e) => onpointermove(e, map)}
            onpointerup={() => {
              drag = null;
              commit();
            }}
            onpointercancel={() => (drag = null)}
            onclickcapture={(e) => {
              if (dragged) e.stopPropagation();
              dragged = false;
            }}
            onpointerleave={() => (tip = null)}
          >
            <defs>
              <!-- Kachelraster wie die Stadtkarte der DS-Spiele -->
              <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" class="grid" />
              </pattern>
            </defs>
            <rect x={-PAD} y={-PAD} width={map.width + 2 * PAD} height={map.height + 2 * PAD} rx="12" class="sea" />
            <rect x={-PAD} y={-PAD} width={map.width + 2 * PAD} height={map.height + 2 * PAD} rx="12" fill="url(#map-grid)" />
            <!-- Versetzte Kopie statt SVG-Filter: Filter werden bei jedem Zoom-/Pan-Frame neu gerendert -->
            <g transform="translate(0 5)">
              {#each map.land as poly, i (i)}
                <polygon points={pts(poly)} class="coast shadow" />
              {/each}
            </g>
            <g>
              <!-- Breite runde Konturen ergeben weiche Küsten -->
              {#each map.land as poly, i (i)}
                <polygon points={pts(poly)} class="coast" />
              {/each}
              {#each map.land as poly, i (i)}
                <polygon points={pts(poly)} class="land" />
              {/each}
            </g>
            {#each map.terrain ?? [] as t, i (i)}
              <polygon points={pts(t.points)} class={["terrain", t.kind]} />
            {/each}
            {#each places as p (p.id)}
              {@const active = !isDeco(p)}
              {@const selected = app.selectedLocationId === p.id}
              {@const n = count(p.id)}
              {@const h = hint(p, n)}
              {@const cls = ["place", p.kind, active ? "active" : "deco", selected && "selected", n > 0 && "filled"]}
              {#if active}
                <g
                  class={cls}
                  role="button"
                  tabindex="0"
                  aria-label="{p.label}, {h}"
                  aria-current={selected || undefined}
                  onclick={() => (app.selectedLocationId = p.id)}
                  onkeydown={(e) => onkey(e, p)}
                  onpointerenter={(e) => showTip(e.currentTarget, p, h)}
                  onpointerleave={() => (tip = null)}
                  onfocus={(e) => onfocus(e, map, p, h)}
                  onblur={() => (tip = null)}
                >
                  {@render shape(p)}
                </g>
              {:else}
                <g class={cls} role="img" aria-label="{p.label}, {h}" onpointerenter={(e) => showTip(e.currentTarget, p, h)} onpointerleave={() => (tip = null)}>
                  {@render shape(p)}
                </g>
              {/if}
            {/each}
          </svg>
        </div>
        {#if roaming.length}
          <!-- Wandernde Pokémon haben keinen festen Ort: immer oben links, unabhängig von Zoom und Ausschnitt -->
          <ul class="absolute top-4 left-4 flex flex-col items-start gap-1" aria-label="Wandernde Pokémon">
            {#each roaming as p (p.id)}
              {@const selected = app.selectedLocationId === p.id}
              <li>
                <Button
                  variant={selected ? "default" : "secondary"}
                  size="sm"
                  aria-current={selected || undefined}
                  title={hint(p, count(p.id))}
                  onclick={() => (app.selectedLocationId = p.id)}
                >
                  <Footprints /> {p.label}
                </Button>
              </li>
            {/each}
          </ul>
        {/if}
        <div class="absolute right-4 bottom-4 flex flex-col gap-1">
          <IconButton variant="secondary" label="Hineinzoomen" onclick={() => zoomCenter(map, 1.5)}>
            <ZoomIn />
          </IconButton>
          <IconButton variant="secondary" label="Herauszoomen" disabled={!zoomed} onclick={() => zoomCenter(map, 1 / 1.5)}>
            <ZoomOut />
          </IconButton>
          <IconButton
            variant="secondary"
            label="Ganze Karte"
            disabled={!zoomed}
            onclick={() => {
              commit();
              view = null;
            }}
          >
            <Maximize />
          </IconButton>
        </div>
      </div>
      <div aria-hidden="true" class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-panel-border px-4 py-2 text-xs text-muted-foreground">
        <span class="flex items-center gap-1.5"><span class="legend filled"></span>{app.original ? "Pokémon vorhanden" : "Pokémon eingetragen"}</span>
        <span class="flex items-center gap-1.5"><span class="legend selected"></span>ausgewählt</span>
        <span class="ml-auto">■ Stadt · ● Ort · ◆ Höhle</span>
      </div>
    {/if}
  {:catch}
    <EmptyState>Für {region} gibt es noch keine Karte.</EmptyState>
  {/await}
</Panel>

{#if tip}
  <div
    bind:clientWidth={tipWidth}
    aria-hidden="true"
    class={[
      !tipWidth && "invisible",
      "pointer-events-none fixed z-50 max-w-64 rounded-md border border-panel-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-lg",
      !tip.below && "-translate-y-full",
    ]}
    style:left="{tipLeft}px"
    style:top="{tip.y}px"
  >
    <div class="text-sm font-semibold">{tip.title}</div>
    <div class="text-xs text-muted-foreground">{tip.hint}</div>
  </div>
{/if}

<style>
  .sea {
    fill: var(--map-sea);
  }
  .grid {
    fill: none;
    stroke: var(--map-sea-line);
    stroke-width: 2;
  }
  .coast,
  .land {
    stroke-linejoin: round;
  }
  .coast.shadow {
    fill: var(--panel-shadow);
    stroke: var(--panel-shadow);
  }
  .coast {
    fill: var(--map-land-edge);
    stroke: var(--map-land-edge);
    stroke-width: 30;
  }
  .land {
    fill: var(--map-land);
    stroke: var(--map-land);
    stroke-width: 22;
  }

  /* Gelände flach mit einfacher Kontur wie auf der Stadtkarte */
  .terrain {
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .terrain.mountain {
    fill: var(--map-mountain);
    stroke: var(--map-mountain-edge);
  }
  .terrain.forest {
    fill: var(--map-forest);
    stroke: var(--map-forest-edge);
  }
  .terrain.water {
    fill: var(--map-sea);
    stroke: var(--map-land-edge);
  }
  .terrain.sand {
    fill: var(--map-sand);
    stroke: var(--map-sand-edge);
  }
  .terrain.snow {
    fill: var(--map-snow);
    stroke: var(--map-snow-edge);
  }

  .place {
    outline: none;
  }
  .hit {
    fill: transparent;
    stroke: transparent;
    stroke-width: 24;
    stroke-linecap: round;
  }
  polyline.hit {
    fill: none;
  }
  /* Kantige Balken wie die Routen der Stadtkarte */
  .casing,
  .road {
    fill: none;
    stroke-linecap: square;
    stroke-linejoin: miter;
    transition: stroke 120ms;
  }
  .casing {
    stroke: var(--map-road-edge);
    stroke-width: 13;
  }
  .road {
    stroke: var(--map-road);
    stroke-width: 8;
  }
  .water .casing {
    stroke: transparent;
  }
  .water .road {
    stroke: var(--map-searoute);
    stroke-width: 4;
    stroke-dasharray: 1 10;
  }

  .marker {
    fill: var(--map-marker);
    stroke: var(--map-marker-edge);
    stroke-width: 2.5;
    transform-box: fill-box;
    transform-origin: center;
    transition:
      transform 120ms,
      fill 120ms;
  }
  .city .marker {
    fill: var(--map-city);
    stroke-width: 3;
  }
  .cave .marker {
    stroke-linejoin: round;
    fill: var(--muted-foreground);
  }

  .deco:not(.city) {
    opacity: 0.4;
  }
  .active {
    cursor: pointer;
  }
  .active:hover .marker,
  .active:focus-visible .marker,
  .selected .marker {
    transform: scale(1.35);
  }
  .active:hover .casing,
  .active:focus-visible .casing {
    stroke: var(--ring);
  }
  .active:focus-visible :is(circle, rect).hit {
    stroke: var(--ring);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }

  .filled .marker {
    fill: var(--primary);
  }
  .filled .road {
    stroke: var(--primary);
  }
  .filled.water .road {
    stroke-dasharray: none;
  }
  /* Kontur trägt den Kontrast zum Meer; :where, damit Hover und Auswahl Vorrang behalten */
  .filled:where(.water) .casing {
    stroke: var(--map-searoute);
    stroke-width: 8;
  }

  .selected .marker {
    stroke: var(--ring);
    stroke-width: 4;
  }
  .selected .casing {
    stroke: var(--ring);
    stroke-width: 17;
  }

  .label {
    fill: var(--foreground);
    font-size: var(--label-size);
    font-weight: 700;
    paint-order: stroke;
    stroke: var(--map-land);
    stroke-width: 0.35em;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .legend {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.2rem;
    border: 2px solid var(--map-marker-edge);
    background-color: var(--map-marker);
  }
  .legend.filled {
    background-color: var(--primary);
  }
  .legend.selected {
    border-color: var(--ring);
  }
</style>
