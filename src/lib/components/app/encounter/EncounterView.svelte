<script lang="ts">
  import ListIcon from "@lucide/svelte/icons/list";
  import MapIcon from "@lucide/svelte/icons/map";
  import { app } from "$lib/runs.svelte.ts";
  import { allLocations } from "$lib/encounters.ts";
  import { EmptyState, IconButton, Panel } from "$lib/components/kit";
  import LocationList from "./LocationList.svelte";
  import LocationEditor from "./LocationEditor.svelte";
  import RegionMap from "./RegionMap.svelte";

  const locations = $derived(app.current && app.data ? allLocations(app.data.locations, app.current) : []);
  const selected = $derived(locations.find((l) => l.id === app.selectedLocationId) ?? null);

  let mode = $state<"list" | "map">("map");
</script>

{#snippet modeSwitch()}
  {#if mode === "map"}
    <IconButton onHeader size="icon-sm" label="Als Liste anzeigen" onclick={() => (mode = "list")}><ListIcon /></IconButton>
  {:else}
    <IconButton onHeader size="icon-sm" label="Als Karte anzeigen" onclick={() => (mode = "map")}><MapIcon /></IconButton>
  {/if}
{/snippet}

<div
  class={[
    "grid h-full min-h-0 gap-3",
    mode === "list" ? "grid-cols-[minmax(16rem,22rem)_1fr]" : "grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)]",
  ]}
>
  {#if mode === "list"}
    <LocationList {locations} actions={modeSwitch} />
  {:else}
    <RegionMap actions={modeSwitch} />
  {/if}
  {#if selected}
    {#key selected.id}
      <LocationEditor location={selected} />
    {/key}
  {:else}
    <Panel flush>
      <EmptyState variant="center">
        {#if mode === "map"}
          Klicke auf der Karte auf eine Route oder einen Ort.
        {:else}
          Wähle links eine Route aus.
        {/if}
      </EmptyState>
    </Panel>
  {/if}
</div>
