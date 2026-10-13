<script lang="ts">
  import PlusIcon from "@lucide/svelte/icons/plus";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { app, mutate, showSpecies } from "$lib/runs.svelte.ts";
  import { addEncounter, countSpecies, isCustomLocation, methodsFor, removeCustomLocation, removeEncounter } from "$lib/encounters.ts";
  import { ENCOUNTER_METHODS, ENCOUNTER_METHOD_LABELS } from "$lib/types.ts";
  import type { EncounterMethod, Location } from "$lib/types.ts";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Sprite from "$lib/components/app/list/Sprite.svelte";
  import SpeciesPicker from "$lib/components/app/list/SpeciesPicker.svelte";
  import { Chip, EmptyState, Panel, Section } from "$lib/components/kit";

  let { location }: { location: Location } = $props();

  // Fallback für Orte ohne Methodendaten (z. B. Legenden: Arceus)
  const DEFAULTS: EncounterMethod[] = ["walk", "surf", "old-rod", "good-rod", "super-rod"];

  let added = $state<EncounterMethod[]>([]);
  let confirmOpen = $state(false);

  const isCustom = $derived(isCustomLocation(location.id));
  const methods = $derived.by(() => {
    const base = methodsFor(location, app.encounters);
    const shown = new Set<EncounterMethod>([...(base.length ? base : DEFAULTS), ...added]);
    return ENCOUNTER_METHODS.filter((m) => shown.has(m));
  });
  const missing = $derived(ENCOUNTER_METHODS.filter((m) => !methods.includes(m)));
  const entryCount = $derived(app.current ? countSpecies(app.current.encounters, location.id) : 0);
  // Ohne Randomizer: Original-Fundorte mit Level, schreibgeschützt
  const original = $derived(app.original?.encounters[location.id]);
  const originalMethods = $derived(ENCOUNTER_METHODS.filter((m) => original?.[m]?.length));

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

<Panel title={location.name} bodyClass="space-y-4 overflow-y-auto">
  {#snippet actions()}
    {#if isCustom}
      <Button variant="ghost" size="xs" onclick={() => (entryCount ? (confirmOpen = true) : removeLocation())}>
        <Trash2Icon /> Route löschen
      </Button>
    {/if}
  {/snippet}
  {#if app.original}
    {#each originalMethods as method (method)}
      <Section title={ENCOUNTER_METHOD_LABELS[method]}>
        <ul class="flex flex-wrap gap-2">
          {#each original?.[method] ?? [] as [id, min, max] (id)}
            <li>
              <Chip onclick={() => showSpecies(id)}>
                <Sprite {id} size={32} />
                {speciesName(id)}
                <span class="text-xs text-muted-foreground tabular-nums">Lv. {min === max ? min : `${min}–${max}`}</span>
              </Chip>
            </li>
          {/each}
        </ul>
      </Section>
    {:else}
      <EmptyState variant="inline">Hier gibt es keine wilden Pokémon.</EmptyState>
    {/each}
  {:else}
    {#each methods as method (method)}
      {@const ids = app.current?.encounters[location.id]?.[method] ?? []}
      {@const max = app.current?.wildMatching ? location.slots?.[method] : undefined}
      <Section title={ENCOUNTER_METHOD_LABELS[method]}>
        {#snippet aside()}
          {#if max}
            <span
              class={ids.length > max ? "text-destructive" : ids.length === max ? "text-primary" : undefined}
              title={ids.length > max ? "Mehr eingetragen, als es hier Slots gibt" : `${max} verschiedene Pokémon`}
            >
              ({ids.length}/{max}){#if ids.length > max}<span class="sr-only">, zu viele</span>{:else if ids.length === max}<span class="sr-only">, voll</span>{/if}
            </span>
          {/if}
        {/snippet}
        <ul class="flex flex-wrap gap-2">
          {#each ids as id (id)}
            <li>
              <Chip
                onclick={() => showSpecies(id)}
                removeLabel="{speciesName(id)} entfernen"
                onRemove={() => mutate((r) => removeEncounter(r, location.id, method, id))}
              >
                <Sprite {id} size={32} />
                {speciesName(id)}
              </Chip>
            </li>
          {:else}
            <li><EmptyState variant="inline">Noch nichts eingetragen.</EmptyState></li>
          {/each}
        </ul>
        <SpeciesPicker
          allowFreeText={false}
          exclude={ids}
          placeholder="Pokémon hinzufügen …"
          onSelect={(v) => add(method, v)}
        />
      </Section>
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
  {/if}
</Panel>

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
