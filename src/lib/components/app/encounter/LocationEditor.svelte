<script lang="ts">
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { app, mutate, showSpecies } from "$lib/runs.svelte.ts";
  import { addEncounter, countSpecies, isCustomLocation, methodsFor, removeCustomLocation, removeEncounter } from "$lib/encounters.ts";
  import { ENCOUNTER_METHODS, ENCOUNTER_METHOD_LABELS } from "$lib/types.ts";
  import type { EncounterMethod, Location } from "$lib/types.ts";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Sprite from "$lib/components/app/list/Sprite.svelte";
  import SpeciesPicker from "$lib/components/app/list/SpeciesPicker.svelte";

  let { location }: { location: Location } = $props();

  // Fallback für Orte ohne Methodendaten (z. B. Legenden: Arceus)
  const DEFAULTS: EncounterMethod[] = ["walk", "surf", "old-rod", "good-rod", "super-rod"];

  let added = $state<EncounterMethod[]>([]);
  let confirmOpen = $state(false);

  const isCustom = $derived(isCustomLocation(location.id));
  const methods = $derived.by(() => {
    const base = app.current ? methodsFor(location, app.current) : [];
    const shown = new Set<EncounterMethod>([...(base.length ? base : DEFAULTS), ...added]);
    return ENCOUNTER_METHODS.filter((m) => shown.has(m));
  });
  const missing = $derived(ENCOUNTER_METHODS.filter((m) => !methods.includes(m)));
  const entryCount = $derived(app.current ? countSpecies(app.current, location.id) : 0);

  function speciesName(id: number): string {
    return app.data?.speciesById.get(id)?.name ?? `#${id}`;
  }

  function add(method: EncounterMethod, v: number | string) {
    if (typeof v === "number") mutate((r) => addEncounter(r, location.id, method, v));
  }

  function removeLocation() {
    mutate((r) => removeCustomLocation(r, location.id));
    app.selectedLocationId = null;
  }
</script>

<section class="panel flex min-h-0 flex-col" aria-labelledby="location-editor-title">
  <div class="panel-header flex items-center justify-between gap-2 px-4 py-2">
    <h2 id="location-editor-title" class="truncate text-sm font-semibold">{location.name}</h2>
    {#if isCustom}
      <Button variant="ghost" size="xs" onclick={() => (entryCount ? (confirmOpen = true) : removeLocation())}>
        <Trash2Icon /> Route löschen
      </Button>
    {/if}
  </div>
  <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
    {#each methods as method (method)}
      {@const ids = app.current?.encounters[location.id]?.[method] ?? []}
      {@const max = app.current?.wildMatching ? location.slots?.[method] : undefined}
      <div class="space-y-2">
        <h3 class="text-sm font-semibold">
          {ENCOUNTER_METHOD_LABELS[method]}
          {#if max}
            <span
              class={["ml-1 tabular-nums", ids.length > max ? "text-destructive" : ids.length === max ? "text-primary" : "text-muted-foreground"]}
              title={ids.length > max ? "Mehr eingetragen, als es hier Slots gibt" : `${max} verschiedene Pokémon`}
            >
              ({ids.length}/{max}){#if ids.length > max}<span class="sr-only">, zu viele</span>{:else if ids.length === max}<span class="sr-only">, voll</span>{/if}
            </span>
          {/if}
        </h3>
        <ul class="flex flex-wrap gap-2">
          {#each ids as id (id)}
            <li class="flex items-center rounded-full border border-panel-border bg-secondary text-secondary-foreground">
              <button
                type="button"
                class="flex items-center gap-1 rounded-l-full py-0.5 pr-1 pl-1 text-sm hover:bg-accent"
                onclick={() => showSpecies(id)}
              >
                <Sprite {id} size={32} />
                {speciesName(id)}
              </button>
              <button
                type="button"
                class="rounded-r-full p-1.5 hover:bg-destructive hover:text-destructive-foreground"
                aria-label="{speciesName(id)} entfernen"
                onclick={() => mutate((r) => removeEncounter(r, location.id, method, id))}
              >
                <XIcon class="size-3.5" />
              </button>
            </li>
          {:else}
            <li class="text-sm text-muted-foreground">Noch nichts eingetragen.</li>
          {/each}
        </ul>
        <SpeciesPicker
          allowFreeText={false}
          exclude={ids}
          placeholder="Pokémon hinzufügen …"
          onSelect={(v) => add(method, v)}
        />
      </div>
    {/each}
    {#if missing.length}
      <div class="flex flex-wrap items-center gap-2 border-t border-panel-border pt-3">
        <span class="text-sm text-muted-foreground">Methode hinzufügen:</span>
        {#each missing as m (m)}
          <Button variant="outline" size="xs" onclick={() => (added = [...added, m])}>
            <PlusIcon /> {ENCOUNTER_METHOD_LABELS[m]}
          </Button>
        {/each}
      </div>
    {/if}
  </div>
</section>

<AlertDialog.Root bind:open={confirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Route „{location.name}“ löschen?</AlertDialog.Title>
      <AlertDialog.Description>
        {entryCount === 1 ? "Ein eingetragenes Pokémon geht" : `${entryCount} eingetragene Pokémon gehen`} verloren.
        Das lässt sich nicht rückgängig machen.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
      <AlertDialog.Action
        variant="destructive"
        onclick={() => {
          confirmOpen = false;
          removeLocation();
        }}
      >
        Löschen
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
