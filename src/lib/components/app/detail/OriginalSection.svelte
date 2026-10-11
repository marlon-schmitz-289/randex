<script lang="ts">
  import { app, showSpecies } from "$lib/runs.svelte.ts";
  import type { Category, Evolution, OriginalPokemon } from "$lib/types.ts";
  import Sprite from "../list/Sprite.svelte";
  import TypeBadge from "../list/TypeBadge.svelte";
  import { MAX, STATS } from "./StatsEditor.svelte";

  let { category, pokemon }: { category: Category; pokemon: OriginalPokemon } = $props();

  const gen1 = $derived(app.data?.game.generation === 1);
  // Gen 1: ein Spezial-Wert (in spa und spd gespeichert), nur einmal anzeigen und zählen
  const stats = $derived(
    gen1 ? STATS.filter((s) => s.key !== "spd").map((s) => (s.key === "spa" ? { ...s, label: "Spezial" } : s)) : STATS,
  );
  const total = $derived(stats.reduce((sum, s) => sum + pokemon.stats[s.key], 0));
  const abilities = $derived(pokemon.abilities.map((name, i) => ({ name, hidden: i === 2 })).filter((a) => a.name));

  const moveName = (id: number) => app.original?.movesById.get(id) ?? `#${id}`;
  const speciesName = (id: number) => app.data?.speciesById.get(id)?.name ?? `#${id}`;
  const evoText = (e: Evolution) => (e.method === "level" ? `Level ${e.value}` : e.value);
</script>

{#if category === "types"}
  <div class="flex gap-1.5">
    {#each pokemon.types as t (t)}
      <TypeBadge id={t} size="md" />
    {/each}
  </div>
{:else if category === "abilities"}
  <ul class="flex flex-col gap-1 text-sm">
    {#each abilities as a, i (i)}
      <li>{a.name}{#if a.hidden}<span class="text-muted-foreground"> (versteckt)</span>{/if}</li>
    {/each}
  </ul>
{:else if category === "stats"}
  <div class="grid grid-cols-[auto_3rem_1fr] items-center gap-x-3 gap-y-1.5" role="group" aria-label="Basiswerte">
    {#each stats as s (s.key)}
      {@const value = pokemon.stats[s.key]}
      <span class="text-sm">{s.label}</span>
      <span class="text-right text-sm tabular-nums">{value}</span>
      <div class="h-2.5 overflow-hidden rounded-full bg-stat-track" aria-hidden="true">
        <div class={["h-full rounded-full", s.bar]} style:width="{(value / MAX) * 100}%"></div>
      </div>
    {/each}
    <span class="text-sm font-semibold">Summe</span>
    <span class="text-right text-sm font-semibold tabular-nums">{total}</span>
  </div>
{:else if category === "evolutions"}
  {#if pokemon.evolutions.length}
    <ul class="flex flex-col gap-1">
      {#each pokemon.evolutions as e, i (i)}
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onclick={() => showSpecies(e.target)}
          >
            <Sprite id={e.target} size={40} />
            <span class="font-medium">{speciesName(e.target)}</span>
            <span class="ml-auto text-xs text-muted-foreground">{evoText(e)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-muted-foreground">Entwickelt sich in diesem Spiel nicht weiter.</p>
  {/if}
{:else if category === "moves"}
  <div class="flex flex-col gap-4">
    <section class="flex flex-col gap-2" aria-labelledby="orig-moves-level">
      <h3 id="orig-moves-level" class="text-sm font-semibold text-muted-foreground">Level-Up</h3>
      <table class="text-sm">
        <thead class="sr-only">
          <tr><th scope="col">Level</th><th scope="col">Attacke</th></tr>
        </thead>
        <tbody>
          {#each pokemon.levelMoves as [level, move], i (i)}
            <tr class="border-b border-panel-border last:border-0">
              <td class="w-16 py-1 tabular-nums text-muted-foreground">{level === 0 ? "Entw." : level}</td>
              <td class="py-1">{moveName(move)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
    {#if pokemon.tmMoves.length || app.original?.tutor}
      <section class="flex flex-col gap-2" aria-labelledby="orig-moves-tm">
        <h3 id="orig-moves-tm" class="text-sm font-semibold text-muted-foreground">
          {app.original?.tutor ? "Lehrer-Attacken" : "TM/VM"}
        </h3>
        {#if app.original?.tutor}
          <p class="text-xs text-muted-foreground">PokeAPI hat für dieses Spiel kaum Lehrer-Daten, die Liste ist unvollständig.</p>
        {/if}
        <ul class="flex flex-wrap gap-1.5">
          {#each pokemon.tmMoves as move (move)}
            {@const label = app.original?.machines[move]}
            <li class="rounded-md border border-border bg-secondary px-2 py-0.5 text-sm text-secondary-foreground">
              {#if label}<span class="text-xs text-muted-foreground tabular-nums">{label}</span>{/if}
              {moveName(move)}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}
