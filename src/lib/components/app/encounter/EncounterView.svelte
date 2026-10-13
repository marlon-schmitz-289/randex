<script lang="ts">
  import ListIcon from "@lucide/svelte/icons/list";
  import MapIcon from "@lucide/svelte/icons/map";
  import { app } from "$lib/runs.svelte.ts";
  import { allLocations } from "$lib/encounters.ts";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { EmptyState, Panel, SegmentItem } from "$lib/components/kit";
  import LocationList from "./LocationList.svelte";
  import LocationEditor from "./LocationEditor.svelte";
  import RegionMap from "./RegionMap.svelte";

  const locations = $derived(app.current && app.data ? allLocations(app.data.locations, app.current) : []);
  const selected = $derived(locations.find((l) => l.id === app.selectedLocationId) ?? null);

  let mode = $state<"list" | "map">("map");
</script>

<div class="flex h-full min-h-0 flex-col gap-3">
  <ToggleGroup.Root
    type="single"
    variant="outline"
    size="sm"
    value={mode}
    onValueChange={(v) => (mode = v === "list" ? "list" : "map")}
    aria-label="Darstellung der Routen"
    class="self-start"
  >
    <SegmentItem value="map"><MapIcon /> Karte</SegmentItem>
    <SegmentItem value="list"><ListIcon /> Liste</SegmentItem>
  </ToggleGroup.Root>

  <div
    class={[
      "grid min-h-0 flex-1 gap-3",
      mode === "list" ? "grid-cols-[minmax(16rem,22rem)_1fr]" : "grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)]",
    ]}
  >
    {#if mode === "list"}
      <LocationList {locations} />
    {:else}
      <RegionMap />
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
</div>
