<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import MapPinIcon from "@lucide/svelte/icons/map-pin";
  import XIcon from "@lucide/svelte/icons/x";
  import type { Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { allLocations, findSightings } from "$lib/encounters.ts";
  import { app, showLocation, updateEntry } from "$lib/runs.svelte.ts";
  import { CATEGORY_LABELS, ENCOUNTER_METHOD_LABELS } from "$lib/types.ts";
  import type { Category, EncounterMethod, PokemonEntry, TypeId } from "$lib/types.ts";
  import EvolutionsEditor from "./detail/EvolutionsEditor.svelte";
  import MovesEditor from "./detail/MovesEditor.svelte";
  import NamePicker from "./detail/NamePicker.svelte";
  import StatsEditor from "./detail/StatsEditor.svelte";
  import Sprite from "./list/Sprite.svelte";
  import TypeBadge from "./list/TypeBadge.svelte";

  const MAX_ABILITIES = 3;

  const id = $derived(app.selectedSpeciesId);
  const species = $derived(id === null ? undefined : app.data?.speciesById.get(id));
  const entry: PokemonEntry = $derived((id !== null && app.current?.pokemon[id]) || {});
  const types = $derived(entry.types ?? []);
  const abilities = $derived(entry.abilities ?? []);
  /** Typen des Spiels plus gespeicherte aus einem anderen Spiel (z. B. Fee nach Wechsel auf Gen 5), damit sie abwählbar bleiben. */
  const typeChoices = $derived([
    ...(app.data?.types.map((t) => t.id) ?? []),
    ...types.filter((t) => !app.data?.typesById.has(t)),
  ]);

  /** Fundorte gruppiert nach Ort, in Reihenfolge der Ortsliste. */
  const sightings = $derived.by(() => {
    if (id === null || !app.current || !app.data) return [];
    const byLoc = new Map<string, EncounterMethod[]>();
    for (const s of findSightings(app.current, id)) {
      byLoc.set(s.locationId, [...(byLoc.get(s.locationId) ?? []), s.method]);
    }
    return allLocations(app.data.locations, app.current)
      .filter((l) => byLoc.has(l.id))
      .map((l) => ({ location: l, methods: byLoc.get(l.id) ?? [] }));
  });

  function toggleType(t: TypeId) {
    if (id === null) return;
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    updateEntry(id, { types: next.length ? next : undefined });
  }

  function setAbilities(list: string[]) {
    if (id === null) return;
    updateEntry(id, { abilities: list.length ? list : undefined });
  }
</script>

{#snippet section(category: Category, body: Snippet)}
  <section class="panel overflow-hidden" aria-labelledby="detail-{category}">
    <h2 id="detail-{category}" class="panel-header text-sm">{CATEGORY_LABELS[category]}</h2>
    <div class="p-4">{@render body()}</div>
  </section>
{/snippet}

{#snippet typesBody()}
  <div class="flex flex-wrap gap-2" role="group" aria-label="Typen (höchstens zwei)">
    {#each typeChoices as t (t)}
      {@const selected = types.includes(t)}
      <button
        type="button"
        aria-pressed={selected}
        disabled={!selected && types.length >= 2}
        class={[
          "relative rounded-md disabled:cursor-not-allowed disabled:opacity-40",
          selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        ]}
        onclick={() => toggleType(t)}
      >
        <TypeBadge id={t} size="md" />
        {#if selected}
          <CheckIcon
            class="absolute -top-2 -right-2 size-4 rounded-full bg-foreground p-0.5 text-background"
            aria-hidden="true"
          />
        {/if}
      </button>
    {/each}
  </div>
  {#if types.length >= 2}
    <p class="mt-2 text-xs text-muted-foreground">Höchstens zwei Typen. Wähle einen ab, um ihn zu ersetzen.</p>
  {/if}
{/snippet}

{#snippet abilitiesBody()}
  <div class="flex flex-col gap-2">
    {#each abilities as ability, i (i)}
      <div class="flex items-center gap-2">
        <NamePicker
          items={app.data?.abilities ?? []}
          value={ability}
          onSelect={(name) => setAbilities(abilities.map((a, j) => (j === i ? name : a)))}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="{ability} entfernen"
          onclick={() => setAbilities(abilities.filter((_, j) => j !== i))}
        >
          <XIcon />
        </Button>
      </div>
    {/each}
    {#if abilities.length < MAX_ABILITIES}
      <NamePicker
        items={app.data?.abilities ?? []}
        value=""
        placeholder="Fähigkeit hinzufügen …"
        onSelect={(name) => !abilities.includes(name) && setAbilities([...abilities, name])}
      />
    {/if}
  </div>
{/snippet}

{#snippet locationsBody()}
  {#if sightings.length}
    <ul class="flex flex-col gap-1">
      {#each sightings as s (s.location.id)}
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onclick={() => showLocation(s.location.id)}
          >
            <MapPinIcon class="size-4 shrink-0 text-primary" />
            <span class="font-medium">{s.location.name}</span>
            <span class="ml-auto text-xs text-muted-foreground">
              {s.methods.map((m) => ENCOUNTER_METHOD_LABELS[m]).join(", ")}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-muted-foreground">
      Noch keine Fundorte. Trage das Pokémon in der Routenansicht bei einem Ort ein.
    </p>
  {/if}
{/snippet}

{#snippet noteBody()}
  <Textarea
    value={entry.note ?? ""}
    placeholder="Notizen zu diesem Pokémon …"
    aria-label="Notiz"
    class="min-h-24"
    oninput={(e) => id !== null && updateEntry(id, { note: e.currentTarget.value || undefined })}
  />
{/snippet}

<div class="h-full overflow-y-auto">
  {#if id === null || !species}
    <div class="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
      Wähle links ein Pokémon aus.
    </div>
  {:else}
    <div class="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <header class="panel overflow-hidden">
        <div class="panel-header flex items-baseline gap-3">
          <span class="tabular-nums">Nr. {String(species.id).padStart(3, "0")}</span>
          <h1 class="text-lg">{species.name}</h1>
        </div>
        <div class="flex items-center gap-4 p-4">
          <div class="grid size-32 shrink-0 place-items-center rounded-lg bg-panel-inset">
            <Sprite id={species.id} size={96} class="[image-rendering:pixelated]" />
          </div>
          <div class="flex flex-col gap-2">
            {#if types.length}
              <div class="flex gap-1.5">
                {#each types as t (t)}
                  <TypeBadge id={t} size="md" />
                {/each}
              </div>
            {/if}
            <p class="text-sm text-muted-foreground">Eingeführt in Generation {species.generation}</p>
          </div>
        </div>
      </header>

      {#each app.activeCategories as category (category)}
        {#if category === "types"}
          {@render section(category, typesBody)}
        {:else if category === "moves"}
          {#snippet movesBody()}<MovesEditor speciesId={species.id} {entry} />{/snippet}
          {@render section(category, movesBody)}
        {:else if category === "stats"}
          {#snippet statsBody()}<StatsEditor speciesId={species.id} {entry} />{/snippet}
          {@render section(category, statsBody)}
        {:else if category === "abilities"}
          {@render section(category, abilitiesBody)}
        {:else if category === "evolutions"}
          {#snippet evolutionsBody()}<EvolutionsEditor speciesId={species.id} {entry} />{/snippet}
          {@render section(category, evolutionsBody)}
        {:else if category === "locations"}
          {@render section(category, locationsBody)}
        {:else}
          {@render section(category, noteBody)}
        {/if}
      {/each}
    </div>
  {/if}
</div>
