<script lang="ts">
  import { tick, untrack } from "svelte";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { app, mutate } from "$lib/runs.svelte.ts";
  import { addCustomLocation, countSpecies } from "$lib/encounters.ts";
  import { normalize } from "$lib/search.ts";
  import type { Location } from "$lib/types.ts";
  import { Input } from "$lib/components/ui/input/index.js";
  import { EmptyState, IconButton, NavRow, Panel } from "$lib/components/kit";

  let { locations }: { locations: Location[] } = $props();

  let query = $state("");
  let newName = $state("");
  let listEl = $state<HTMLUListElement | null>(null);

  const shown = $derived.by(() => {
    const q = normalize(query.trim());
    return q ? locations.filter((l) => normalize(l.name).includes(q)) : locations;
  });

  // Filter zurücksetzen und nach dem Rendern zur gewählten Route scrollen
  $effect(() => {
    const id = app.selectedLocationId;
    if (!id) return;
    untrack(() => {
      if (!shown.some((l) => l.id === id)) query = "";
    });
    void tick().then(() => listEl?.querySelector("[aria-current='true']")?.scrollIntoView({ block: "nearest" }));
  });

  function add(e: SubmitEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    let id = "";
    mutate((r) => (id = addCustomLocation(r, name).id));
    if (!id) return;
    app.selectedLocationId = id;
    newName = "";
  }
</script>

<Panel title="Routen ({locations.length})" flush bodyClass="flex flex-col" footer={app.original ? undefined : addForm}>
  <div class="p-3">
    <Input type="search" placeholder="Route suchen …" aria-label="Route suchen" bind:value={query} />
  </div>
  <ul bind:this={listEl} aria-label="Routen" class="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-2">
    {#each shown as loc (loc.id)}
      {@const n = countSpecies(app.encounters, loc.id)}
      <li>
        <NavRow current={app.selectedLocationId === loc.id} onclick={() => (app.selectedLocationId = loc.id)}>
          <span class="truncate">{loc.name}</span>
          {#snippet meta()}
            {#if n}
              <span class="rounded-full bg-primary px-2 text-primary-foreground">
                {n}<span class="sr-only"> Pokémon</span>
              </span>
            {/if}
          {/snippet}
        </NavRow>
      </li>
    {:else}
      <li>
        <EmptyState variant="inline" class="px-2 py-2">
          {query.trim() ? "Keine Treffer." : app.original ? "Keine Routen für dieses Spiel." : "Keine Routen für dieses Spiel. Lege unten eine eigene an."}
        </EmptyState>
      </li>
    {/each}
  </ul>
</Panel>

{#snippet addForm()}
  <form class="flex w-full gap-2" onsubmit={add}>
    <Input placeholder="Eigene Route …" aria-label="Name der eigenen Route" bind:value={newName} />
    <IconButton type="submit" variant="default" label="Route hinzufügen" disabled={!newName.trim()}>
      <PlusIcon />
    </IconButton>
  </form>
{/snippet}
