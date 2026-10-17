<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import { app, toggleCaught } from "$lib/runs.svelte.ts";
  import { searchSpecies } from "$lib/search.ts";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { EmptyState, Hint, Panel, SegmentItem, SelectCard, StatBar } from "$lib/components/kit";
  import DexSelect from "./list/DexSelect.svelte";
  import Sprite from "./list/Sprite.svelte";

  type CaughtFilter = "all" | "caught" | "missing";
  const FILTERS: { value: CaughtFilter; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "caught", label: "Gefangen" },
    { value: "missing", label: "Fehlend" },
  ];

  let query = $state("");
  let filter = $state<CaughtFilter>("all");

  const caught = $derived(new Set(app.current?.caught ?? []));
  const total = $derived(app.dexSpecies.length);
  const done = $derived(app.dexSpecies.filter((s) => caught.has(s.id)).length);
  const results = $derived(
    searchSpecies(app.dexSpecies, app.current, { query, filter: "all", type: null, numberOf: app.dexNumber }).filter(
      (s) => filter === "all" || caught.has(s.id) === (filter === "caught"),
    ),
  );
  const percent = $derived(total ? Math.floor((done / total) * 100) : 0);
</script>

<Panel title="Pokédex {app.dex?.name ?? 'National'}" class="h-full" bodyClass="flex min-h-0 flex-col gap-3">
  <div class="flex items-center gap-3">
    <StatBar value={done} max={total || 1} class="bg-primary" />
    <span class="shrink-0 text-sm tabular-nums">
      <span class="font-semibold">{done}</span> / {total} gefangen ({percent} %)
    </span>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative w-64">
      <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input bind:value={query} placeholder="Name oder Nummer …" class="pl-8" aria-label="Pokédex durchsuchen" />
    </div>
    <DexSelect />
    <ToggleGroup.Root
      type="single"
      variant="outline"
      size="sm"
      value={filter}
      onValueChange={(v) => (filter = FILTERS.find((f) => f.value === v)?.value ?? "all")}
      aria-label="Filter"
    >
      {#each FILTERS as f (f.value)}
        <SegmentItem value={f.value}>{f.label}</SegmentItem>
      {/each}
    </ToggleGroup.Root>
    <Hint live class="ml-auto">{results.length} Pokémon</Hint>
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto p-1">
    {#if results.length}
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
        {#each results as s (s.id)}
          {@const on = caught.has(s.id)}
          <li data-species={s.id}>
            <SelectCard
              pressed={on}
              label="{s.name} gefangen"
              onclick={() => toggleCaught(s.id)}
              class="flex w-full flex-col items-center gap-1 p-2"
            >
              <Sprite
                id={s.id}
                size={56}
                class="transition-[filter,opacity] {on ? '' : 'opacity-50 grayscale group-hover:opacity-80'}"
              />
              <span class="text-xs tabular-nums">#{String(app.dexNumber(s.id)).padStart(3, "0")}</span>
              <span class="w-full truncate text-center text-sm font-medium">{s.name}</span>
            </SelectCard>
          </li>
        {/each}
      </ul>
    {:else}
      <EmptyState>Keine Treffer.</EmptyState>
    {/if}
  </div>
</Panel>
