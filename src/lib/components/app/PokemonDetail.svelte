<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import MapPinIcon from "@lucide/svelte/icons/map-pin";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { EditRow, EmptyState, Hint, NavRow, Panel } from "$lib/components/kit";
  import { allLocations, findSightings } from "$lib/encounters.ts";
  import { app, showLocation, updateEntry } from "$lib/runs.svelte.ts";
  import { CATEGORY_LABELS, ENCOUNTER_METHOD_LABELS } from "$lib/types.ts";
  import type { Category, EncounterMethod, PokemonEntry, TypeId } from "$lib/types.ts";
  import EvolutionsEditor from "./detail/EvolutionsEditor.svelte";
  import MovesEditor from "./detail/MovesEditor.svelte";
  import NamePicker from "./detail/NamePicker.svelte";
  import OriginalSection from "./detail/OriginalSection.svelte";
  import StatsEditor from "./detail/StatsEditor.svelte";
  import Sprite from "./list/Sprite.svelte";
  import TypeBadge from "./list/TypeBadge.svelte";

  const MAX_ABILITIES = 3;

  const id = $derived(app.selectedSpeciesId);
  const species = $derived(id === null ? undefined : app.data?.speciesById.get(id));
  const entry: PokemonEntry = $derived((id !== null && app.current?.pokemon[id]) || {});
  const types = $derived(entry.types ?? []);
  const original = $derived(id === null ? undefined : app.original?.pokemon[id]);
  const headerTypes = $derived(app.original ? (original?.types ?? []) : types);
  // Ohne Originaldaten zur Art bleiben nur Fundorte und Notiz.
  // Breit paarweise nebeneinander (Typen | Fähigkeiten, Attacken | Entwicklungen, Stats | Fundorte)
  const PAIRED_ORDER: Category[] = ["types", "abilities", "moves", "evolutions", "stats", "locations", "note"];
  const categories = $derived(
    app.original && !original ? app.activeCategories.filter((c) => c === "locations" || c === "note") : app.activeCategories,
  );
  const ordered = $derived(PAIRED_ORDER.filter((c) => categories.includes(c)));
  const abilities = $derived(entry.abilities ?? []);
  /** Auch gespeicherte Typen aus anderen Spielen (z. B. Fee in Gen 5), damit sie abwählbar bleiben. */
  const typeChoices = $derived([
    ...(app.data?.types.map((t) => t.id) ?? []),
    ...types.filter((t) => !app.data?.typesById.has(t)),
  ]);

  const sightings = $derived.by(() => {
    if (id === null || !app.current || !app.data) return [];
    const byLoc = new Map<string, EncounterMethod[]>();
    for (const s of findSightings(app.encounters, id)) {
      byLoc.set(s.locationId, [...(byLoc.get(s.locationId) ?? []), s.method]);
    }
    return allLocations(app.data.locations, app.current)
      .filter((l) => byLoc.has(l.id))
      .map((l) => ({ location: l, methods: byLoc.get(l.id) ?? [] }));
  });

  function update(patch: Partial<PokemonEntry>) {
    if (id !== null) updateEntry(id, patch);
  }

  function toggleType(t: TypeId) {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    update({ types: next.length ? next : undefined });
  }

  function setAbilities(list: string[]) {
    update({ abilities: list.length ? list : undefined });
  }
</script>

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
    <Hint class="mt-2">Höchstens zwei Typen. Wähle einen ab, um ihn zu ersetzen.</Hint>
  {/if}
{/snippet}

{#snippet abilitiesBody()}
  <ul class="flex flex-col gap-2">
    {#each abilities as ability, i (i)}
      <EditRow removeLabel="{ability} entfernen" onRemove={() => setAbilities(abilities.filter((_, j) => j !== i))}>
        <NamePicker
          items={app.data?.abilities ?? []}
          value={ability}
          label="Fähigkeit {i + 1}"
          onSelect={(name) => setAbilities(abilities.map((a, j) => (j === i ? name : a)))}
        />
      </EditRow>
    {/each}
    {#if abilities.length < MAX_ABILITIES}
      <EditRow>
        <NamePicker
          items={app.data?.abilities ?? []}
          value=""
          placeholder="Fähigkeit hinzufügen …"
          onSelect={(name) => !abilities.includes(name) && setAbilities([...abilities, name])}
        />
      </EditRow>
    {/if}
  </ul>
{/snippet}

{#snippet locationsBody()}
  {#if sightings.length}
    <ul class="flex flex-col gap-1">
      {#each sightings as s (s.location.id)}
        <li>
          <NavRow onclick={() => showLocation(s.location.id)}>
            <MapPinIcon class="size-4 shrink-0 text-primary" />
            <span class="font-medium">{s.location.name}</span>
            {#snippet meta()}{s.methods.map((m) => ENCOUNTER_METHOD_LABELS[m]).join(", ")}{/snippet}
          </NavRow>
        </li>
      {/each}
    </ul>
  {:else if !app.original}
    <EmptyState variant="inline">
      Noch keine Fundorte. Trage das Pokémon in der Routenansicht bei einem Ort ein.
    </EmptyState>
  {:else}
    <EmptyState variant="inline">In diesem Spiel nicht wild anzutreffen.</EmptyState>
  {/if}
{/snippet}

{#snippet noteBody()}
  <Textarea
    value={entry.note ?? ""}
    placeholder="Notizen zu diesem Pokémon …"
    aria-label="Notiz"
    class="min-h-24"
    oninput={(e) => update({ note: e.currentTarget.value || undefined })}
  />
{/snippet}

<div class="@container h-full overflow-y-auto">
  {#if id === null || !species}
    <EmptyState variant="center">Wähle links ein Pokémon aus.</EmptyState>
  {:else}
    <div class="flex flex-col gap-3">
      <Panel bodyClass="flex items-center gap-4">
        {#snippet header()}
          <span class="tabular-nums">Nr. {String(species.id).padStart(3, "0")}</span>
          <h1 class="text-lg">{species.name}</h1>
        {/snippet}
        <div class="grid size-32 shrink-0 place-items-center rounded-lg bg-panel-inset">
          <Sprite id={species.id} size={96} class="[image-rendering:pixelated]" />
        </div>
        <div class="flex flex-col gap-2">
          {#if headerTypes.length}
            <div class="flex gap-1.5">
              {#each headerTypes as t (t)}
                <TypeBadge id={t} size="md" />
              {/each}
            </div>
          {/if}
          <p class="text-sm text-muted-foreground">Eingeführt in Generation {species.generation}</p>
        </div>
      </Panel>

      {#if app.original && !original}
        <Panel>
          <EmptyState variant="inline">
            Für dieses Spiel liefert PokeAPI keine Daten zu diesem Pokémon (kommt vermutlich nicht vor).
          </EmptyState>
        </Panel>
      {/if}
      <!-- Paare teilen Zeile und Höhe; ein einzelner letzter Abschnitt nimmt die volle Breite -->
      <div class="grid gap-3 @5xl:grid-cols-2">
        {#each ordered as category (category)}
          <Panel title={CATEGORY_LABELS[category]} class="@5xl:[&:last-child:nth-child(odd)]:col-span-2">
            {#if original && category !== "locations" && category !== "note"}
              <OriginalSection {category} pokemon={original} />
            {:else if category === "types"}
              {@render typesBody()}
            {:else if category === "moves"}
              <MovesEditor speciesId={species.id} {entry} />
            {:else if category === "stats"}
              <StatsEditor speciesId={species.id} {entry} />
            {:else if category === "abilities"}
              {@render abilitiesBody()}
            {:else if category === "evolutions"}
              <EvolutionsEditor speciesId={species.id} {entry} />
            {:else if category === "locations"}
              {@render locationsBody()}
            {:else}
              {@render noteBody()}
            {/if}
          </Panel>
        {/each}
      </div>
    </div>
  {/if}
</div>
