<script lang="ts">
  import { app } from "$lib/runs.svelte.ts";
  import { loadRegionMap } from "$lib/data.ts";
  import { countSpecies } from "$lib/encounters.ts";
  import type { Location, MapPlace } from "$lib/types.ts";

  let { locations }: { locations: Location[] } = $props();

  const region = $derived(app.data?.game.region ?? "");
  const mapPromise = $derived(region ? loadRegionMap(region) : null);
  const known = $derived(new Set(locations.map((l) => l.id)));

  const PAD = 30;

  const count = (id: string) => (app.current ? countSpecies(app.current, id) : 0);
  const pts = (points: [number, number][]) => points.map(([x, y]) => `${x},${y}`).join(" ");
  const isDeco = (p: MapPlace) => p.id.startsWith("deco-");
  // Städte zuletzt, damit ihre Labels nicht überdeckt werden
  const order = (p: MapPlace) => (p.points.length > 1 ? 0 : p.kind === "city" ? 2 : 1);

  function hint(p: MapPlace, n: number): string {
    if (isDeco(p)) return "keine wilden Pokémon";
    if (!known.has(p.id)) return "nicht in diesem Spiel";
    return n ? `${n} Pokémon eingetragen` : "noch nichts eingetragen";
  }

  // fixed, damit weder Panel noch Fenster den Tooltip abschneiden
  let tip = $state<{ title: string; hint: string; x: number; y: number; below: boolean } | null>(null);
  let tipWidth = $state(0);
  const EDGE = 8;
  const tipLeft = $derived(tip ? Math.min(Math.max(tip.x - tipWidth / 2, EDGE), window.innerWidth - tipWidth - EDGE) : 0);

  function showTip(e: Event, p: MapPlace, text: string) {
    if (!(e.currentTarget instanceof Element)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const below = r.top < 64;
    tip = { title: p.label, hint: text, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below };
  }

  function onkey(e: KeyboardEvent, p: MapPlace) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    app.selectedLocationId = p.id;
  }
</script>

<svelte:window onresize={() => (tip = null)} />

{#snippet shape(p: MapPlace)}
  {@const [x, y] = p.points[0]}
  {#if p.points.length > 1}
    <polyline points={pts(p.points)} class="hit" />
    <polyline points={pts(p.points)} class="casing" />
    <polyline points={pts(p.points)} class="road" />
  {:else if p.kind === "city"}
    <rect x={x - 13} y={y - 13} width="26" height="26" rx="6" class="hit" />
    <rect x={x - 9} y={y - 9} width="18" height="18" rx="4" class="marker" />
    <text {x} y={y + 27} text-anchor="middle" class="label">{p.label}</text>
  {:else if p.kind === "cave"}
    <circle cx={x} cy={y} r="14" class="hit" />
    <polygon points="{x},{y - 8} {x + 8},{y} {x},{y + 8} {x - 8},{y}" class="marker" />
  {:else}
    <circle cx={x} cy={y} r="14" class="hit" />
    <circle cx={x} cy={y} r="6.5" class="marker" />
  {/if}
{/snippet}

<section class="panel flex min-h-0 flex-col">
  <h2 class="panel-header px-4 py-2 text-sm">Karte {region}</h2>
  {#await mapPromise}
    <p class="p-4 text-sm text-muted-foreground">Karte wird geladen …</p>
  {:then map}
    {#if map}
      {@const places = [...map.places].sort((a, b) => order(a) - order(b))}
      <div class="min-h-0 flex-1 p-2">
        <svg
          viewBox="{-PAD} {-PAD} {map.width + 2 * PAD} {map.height + 2 * PAD}"
          class="size-full"
          role="group"
          aria-label="Karte {region}"
          onpointerleave={() => (tip = null)}
        >
          <defs>
            <pattern id="map-waves" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
              <line x1="0" y1="7" x2="14" y2="7" class="wave" />
            </pattern>
            <filter id="map-shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25" />
            </filter>
          </defs>
          <rect x={-PAD} y={-PAD} width={map.width + 2 * PAD} height={map.height + 2 * PAD} rx="12" class="sea" />
          <rect x={-PAD} y={-PAD} width={map.width + 2 * PAD} height={map.height + 2 * PAD} rx="12" fill="url(#map-waves)" />
          <g filter="url(#map-shadow)">
            <!-- Breite runde Konturen ergeben weiche Küsten -->
            {#each map.land as poly, i (i)}
              <polygon points={pts(poly)} class="coast" />
            {/each}
            {#each map.land as poly, i (i)}
              <polygon points={pts(poly)} class="land" />
            {/each}
          </g>
          {#each places as p (p.id)}
            {@const active = known.has(p.id)}
            {@const selected = app.selectedLocationId === p.id}
            {@const n = count(p.id)}
            {@const h = hint(p, n)}
            {@const cls = ["place", p.kind, active ? "active" : isDeco(p) ? "deco" : "inactive", selected && "selected", n > 0 && "filled"]}
            {#if active}
              <g
                class={cls}
                role="button"
                tabindex="0"
                aria-label="{p.label}, {h}"
                aria-current={selected || undefined}
                onclick={() => (app.selectedLocationId = p.id)}
                onkeydown={(e) => onkey(e, p)}
                onpointerenter={(e) => showTip(e, p, h)}
                onpointerleave={() => (tip = null)}
                onfocus={(e) => showTip(e, p, h)}
                onblur={() => (tip = null)}
              >
                {@render shape(p)}
              </g>
            {:else}
              <g class={cls} role="img" aria-label="{p.label}, {h}" onpointerenter={(e) => showTip(e, p, h)} onpointerleave={() => (tip = null)}>
                {@render shape(p)}
              </g>
            {/if}
          {/each}
        </svg>
      </div>
      <div aria-hidden="true" class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-panel-border px-4 py-2 text-xs text-muted-foreground">
        <span class="flex items-center gap-1.5"><span class="legend filled"></span>Pokémon eingetragen</span>
        <span class="flex items-center gap-1.5"><span class="legend selected"></span>ausgewählt</span>
        <span class="flex items-center gap-1.5"><span class="legend opacity-40"></span>nicht in diesem Spiel</span>
        <span class="ml-auto">■ Stadt · ● Ort · ◆ Höhle</span>
      </div>
    {/if}
  {:catch}
    <p class="p-4 text-sm text-muted-foreground">Für {region} gibt es noch keine Karte.</p>
  {/await}
</section>

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
  .wave {
    stroke: var(--map-sea-line);
    stroke-width: 3;
  }
  .coast,
  .land {
    stroke-linejoin: round;
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
  .casing,
  .road {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 120ms;
  }
  .casing {
    stroke: var(--map-road-edge);
    stroke-width: 10;
  }
  .road {
    stroke: var(--map-road);
    stroke-width: 6;
  }
  .water .casing {
    stroke: transparent;
  }
  .water .road {
    stroke: var(--type-water);
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
    stroke-width: 3;
  }
  .cave .marker {
    stroke-linejoin: round;
    fill: var(--muted-foreground);
  }

  .inactive,
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

  .selected .marker {
    stroke: var(--ring);
    stroke-width: 4;
  }
  .selected .casing {
    stroke: var(--ring);
    stroke-width: 14;
  }

  .label {
    fill: var(--foreground);
    font-size: 14px;
    font-weight: 700;
    paint-order: stroke;
    stroke: var(--map-land);
    stroke-width: 5;
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
