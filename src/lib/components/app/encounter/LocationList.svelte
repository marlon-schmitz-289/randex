<script lang="ts">
  import { tick, untrack } from "svelte";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { app, mutate } from "$lib/runs.svelte.ts";
  import { addCustomLocation } from "$lib/encounters.ts";
  import { normalize } from "$lib/search.ts";
  import type { Location } from "$lib/types.ts";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";

  let { locations }: { locations: Location[] } = $props();

  let query = $state("");
  let newName = $state("");
  let listEl = $state<HTMLUListElement | null>(null);

  const shown = $derived.by(() => {
    const q = normalize(query.trim());
    return q ? locations.filter((l) => normalize(l.name).includes(q)) : locations;
  });

  // Gewählte Route (z. B. per Klick auf einen Fundort) sichtbar machen.
  $effect(() => {
    const id = app.selectedLocationId;
    if (!id) return;
    untrack(() => {
      if (!shown.some((l) => l.id === id)) query = "";
    });
    void tick().then(() => listEl?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "nearest" }));
  });

  function count(id: string): number {
    const byMethod = app.current?.encounters[id] ?? {};
    return new Set(Object.values(byMethod).flat()).size;
  }

  function add(e: SubmitEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    let id = "";
    mutate((r) => (id = addCustomLocation(r, name).id));
    app.selectedLocationId = id;
    newName = "";
  }
</script>

<section class="panel flex min-h-0 flex-col">
  <h2 class="panel-header px-4 py-2 text-sm font-semibold">Routen ({locations.length})</h2>
  <div class="p-3">
    <Input type="search" placeholder="Route suchen …" aria-label="Route suchen" bind:value={query} />
  </div>
  <ul bind:this={listEl} class="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-2">
    {#each shown as loc (loc.id)}
      {@const n = count(loc.id)}
      <li>
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-md border-l-4 border-transparent px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground aria-[current=true]:border-panel-header aria-[current=true]:bg-panel-header aria-[current=true]:text-panel-header-foreground"
          aria-current={app.selectedLocationId === loc.id}
          onclick={() => (app.selectedLocationId = loc.id)}
        >
          <span class="truncate">{loc.name}</span>
          {#if n}
            <span class="shrink-0 rounded-full bg-primary px-2 text-xs text-primary-foreground" title="{n} Pokémon">
              {n}<span class="sr-only"> Pokémon</span>
            </span>
          {/if}
        </button>
      </li>
    {:else}
      <li class="px-3 py-2 text-sm text-muted-foreground">
        {query.trim() ? "Keine Treffer." : "Keine Routen für dieses Spiel. Lege unten eine eigene an."}
      </li>
    {/each}
  </ul>
  <form class="flex gap-2 border-t border-panel-border p-3" onsubmit={add}>
    <Input placeholder="Eigene Route …" aria-label="Name der eigenen Route" bind:value={newName} />
    <Button type="submit" size="icon" aria-label="Route hinzufügen" disabled={!newName.trim()}>
      <PlusIcon />
    </Button>
  </form>
</section>
