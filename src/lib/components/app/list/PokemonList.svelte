<script lang="ts">
  import { untrack } from "svelte";
  import Check from "@lucide/svelte/icons/check";
  import Search from "@lucide/svelte/icons/search";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { EmptyState, Hint, NavRow, SegmentItem } from "$lib/components/kit";
  import { app, showSpecies } from "$lib/runs.svelte.ts";
  import { hasEntry, searchSpecies, type EntryFilter } from "$lib/search.ts";
  import type { TypeId } from "$lib/types.ts";
  import Sprite from "./Sprite.svelte";
  import TypeBadge from "./TypeBadge.svelte";

  const ROW = 48;
  const OVERSCAN = 6;
  const FILTERS: { value: EntryFilter; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "entered", label: "Eingetragen" },
    { value: "missing", label: "Fehlend" },
  ];

  let query = $state("");
  let filter = $state<EntryFilter>("all");
  let type = $state<TypeId | "all">("all");
  let scrollTop = $state(0);
  let viewH = $state(0);
  let searchEl = $state<HTMLInputElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);

  // Typfilter aus einem anderen Spiel (z. B. Fee nach Wechsel auf Gen 5) gilt als „Alle Typen“.
  const activeType = $derived(type !== "all" && app.data?.typesById.has(type) ? type : null);
  // Ohne Randomizer nur Arten mit Originaldaten; eigenes $derived, damit der Namensindex (WeakMap) stabil bleibt.
  const species = $derived.by(() => {
    const { data, original } = app;
    if (!data) return [];
    return original ? data.species.filter((s) => original.pokemon[s.id]) : data.species;
  });
  const typesOf = (id: number) => (app.original ? app.original.pokemon[id]?.types : app.current?.pokemon[id]?.types);
  const activeFilter = $derived(app.original ? "all" : filter);
  const results = $derived(searchSpecies(species, app.current, { query, filter: activeFilter, type: activeType, typesOf }));
  const isFilter = (v: string): v is EntryFilter => FILTERS.some((f) => f.value === v);
  const first = $derived(Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN));
  const last = $derived(Math.min(results.length, Math.ceil((scrollTop + viewH) / ROW) + OVERSCAN));
  const visible = $derived(results.slice(first, last));

  // Neues Spiel/neue Filter (nicht jede Eingabe): zur Auswahl springen, sonst an den Anfang.
  $effect(() => {
    void [query, activeFilter, activeType, species];
    untrack(() => {
      if (!listEl) return;
      const i = results.findIndex((s) => s.id === app.selectedSpeciesId);
      if (i < 0) listEl.scrollTop = 0;
      else ensureVisible(i);
    });
  });

  function ensureVisible(i: number) {
    if (!listEl) return;
    if (i * ROW < listEl.scrollTop) listEl.scrollTop = i * ROW;
    else if ((i + 1) * ROW > listEl.scrollTop + listEl.clientHeight)
      listEl.scrollTop = (i + 1) * ROW - listEl.clientHeight;
  }

  function move(delta: 1 | -1) {
    if (!results.length) return;
    const cur = results.findIndex((s) => s.id === app.selectedSpeciesId);
    const next = cur < 0 ? (delta > 0 ? 0 : results.length - 1) : Math.min(results.length - 1, Math.max(0, cur + delta));
    app.selectedSpeciesId = results[next].id;
    ensureVisible(next);
  }

  function typingTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    return t.isContentEditable || !!t.closest("input, textarea, select, [role='dialog'], [role='alertdialog'], [role='listbox'], [role='menu'], [role='tab']");
  }

  function onKeydown(e: KeyboardEvent) {
    if (app.view !== "pokemon" || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target === searchEl && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      move(e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (typingTarget(e.target)) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      searchEl?.focus();
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key.length === 1 && e.key !== " ") {
      searchEl?.focus();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex h-full min-h-0 flex-col gap-2">
  <div class="relative">
    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      bind:ref={searchEl}
      bind:value={query}
      placeholder="Name oder Nr. suchen"
      aria-label="Pokémon suchen"
      class="pl-8"
    />
  </div>
  <div class="flex flex-wrap items-center gap-2">
    {#if !app.original}
      <ToggleGroup.Root
        type="single"
        variant="outline"
        size="sm"
        value={filter}
        onValueChange={(v) => (filter = isFilter(v) ? v : "all")}
        aria-label="Filter"
      >
        {#each FILTERS as f (f.value)}
          <SegmentItem value={f.value}>{f.label}</SegmentItem>
        {/each}
      </ToggleGroup.Root>
    {/if}
    <Select.Root type="single" value={activeType ?? "all"} onValueChange={(v) => (type = app.data?.typesById.get(v)?.id ?? "all")}>
      <Select.Trigger size="sm" class="w-32" aria-label="Typfilter">
        {activeType ? (app.data?.typesById.get(activeType)?.name ?? activeType) : "Alle Typen"}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="all">Alle Typen</Select.Item>
        {#each app.data?.types ?? [] as t (t.id)}
          <Select.Item value={t.id}>{t.name}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
  <Hint live>{results.length} Pokémon</Hint>

  <div
    bind:this={listEl}
    bind:clientHeight={viewH}
    onscroll={() => (scrollTop = listEl?.scrollTop ?? 0)}
    class="panel min-h-0 flex-1 overflow-y-auto"
  >
    {#if results.length === 0}
      <EmptyState>Keine Treffer.</EmptyState>
    {:else}
      <div class="relative" style="height:{results.length * ROW}px" role="list" aria-label="Pokémon">
        {#each visible as s, i (s.id)}
          {@const selected = s.id === app.selectedSpeciesId}
          {@const entered = app.current ? hasEntry(app.current, s.id) : false}
          {@const types = typesOf(s.id) ?? []}
          <div
            role="listitem"
            aria-setsize={results.length}
            aria-posinset={first + i + 1}
            class="absolute inset-x-0"
            style="top:{(first + i) * ROW}px;height:{ROW}px"
          >
            <NavRow
              current={selected}
              onclick={() => showSpecies(s.id)}
              class="size-full rounded-none py-0 focus-visible:-outline-offset-2"
            >
              <Sprite id={s.id} size={40} />
              <span class="w-11 shrink-0 text-xs tabular-nums {selected ? '' : 'text-muted-foreground'}">#{String(s.id).padStart(3, "0")}</span>
              <span class="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              {#each types as t (t)}
                <TypeBadge id={t} size="sm" />
              {/each}
              {#if !app.original}
                {#if entered}
                  <Check class="size-4 shrink-0" aria-hidden="true" />
                  <span class="sr-only">Eingetragen</span>
                {:else}
                  <span class="size-4 shrink-0 text-center {selected ? '' : 'text-muted-foreground'}" aria-hidden="true">–</span>
                  <span class="sr-only">Fehlt</span>
                {/if}
              {/if}
            </NavRow>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
