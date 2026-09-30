<script lang="ts">
  import { untrack } from "svelte";
  import Check from "@lucide/svelte/icons/check";
  import Search from "@lucide/svelte/icons/search";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
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
  const results = $derived(
    app.data ? searchSpecies(app.data.species, app.current, { query, filter, type: activeType }) : [],
  );
  const isFilter = (v: string): v is EntryFilter => FILTERS.some((f) => f.value === v);
  const first = $derived(Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN));
  const last = $derived(Math.min(results.length, Math.ceil((scrollTop + viewH) / ROW) + OVERSCAN));
  const visible = $derived(results.slice(first, last));

  // Neues Spiel/neue Filter (nicht jede Eingabe): zur Auswahl springen, sonst an den Anfang.
  $effect(() => {
    void [query, filter, activeType, app.data];
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
    <ToggleGroup.Root
      type="single"
      variant="outline"
      size="sm"
      value={filter}
      onValueChange={(v) => (filter = isFilter(v) ? v : "all")}
      aria-label="Filter"
    >
      {#each FILTERS as f (f.value)}
        <ToggleGroup.Item
          value={f.value}
          class="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >{f.label}</ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>
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
  <p class="text-xs text-muted-foreground" aria-live="polite">{results.length} Pokémon</p>

  <div
    bind:this={listEl}
    bind:clientHeight={viewH}
    onscroll={() => (scrollTop = listEl?.scrollTop ?? 0)}
    class="panel min-h-0 flex-1 overflow-y-auto"
  >
    {#if results.length === 0}
      <p class="p-4 text-sm text-muted-foreground">Keine Treffer.</p>
    {:else}
      <div class="relative" style="height:{results.length * ROW}px" role="list" aria-label="Pokémon">
        {#each visible as s, i (s.id)}
          {@const selected = s.id === app.selectedSpeciesId}
          {@const entered = app.current ? hasEntry(app.current, s.id) : false}
          {@const types = app.current?.pokemon[s.id]?.types ?? []}
          <div
            role="listitem"
            aria-setsize={results.length}
            aria-posinset={first + i + 1}
            class="absolute inset-x-0"
            style="top:{(first + i) * ROW}px;height:{ROW}px"
          >
            <button
              type="button"
              aria-current={selected ? "true" : undefined}
              onclick={() => showSpecies(s.id)}
              class="flex size-full items-center gap-2 border-l-4 px-2 focus-visible:-outline-offset-2 text-left hover:bg-accent hover:text-accent-foreground {selected
                ? 'border-panel-header bg-panel-header text-panel-header-foreground hover:bg-panel-header hover:text-panel-header-foreground'
                : 'border-transparent'}"
            >
              <Sprite id={s.id} size={40} />
              <span class="w-11 shrink-0 text-xs tabular-nums {selected ? '' : 'text-muted-foreground'}">#{String(s.id).padStart(3, "0")}</span>
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              {#each types as t (t)}
                <TypeBadge id={t} size="sm" />
              {/each}
              {#if entered}
                <Check class="size-4 shrink-0" aria-hidden="true" />
                <span class="sr-only">Eingetragen</span>
              {:else}
                <span class="size-4 shrink-0 text-center {selected ? '' : 'text-muted-foreground'}" aria-hidden="true">–</span>
                <span class="sr-only">Fehlt</span>
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
