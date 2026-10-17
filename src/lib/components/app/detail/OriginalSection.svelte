<script lang="ts">
  import { Chip, EmptyState, Hint, NavRow, Section, StatBar } from "$lib/components/kit";
  import CornerDownRight from "@lucide/svelte/icons/corner-down-right";
  import { app, showSpecies } from "$lib/runs.svelte.ts";
  import type { Category, Evolution, OriginalPokemon } from "$lib/types.ts";
  import ItemIcon from "../ItemIcon.svelte";
  import Sprite from "../list/Sprite.svelte";
  import TypeBadge from "../list/TypeBadge.svelte";
  import { MAX, STATS } from "./StatsEditor.svelte";

  let { category, id, pokemon }: { category: Category; id: number; pokemon: OriginalPokemon } = $props();

  const gen1 = $derived(app.data?.game.generation === 1);
  // Gen 1: ein Spezial-Wert (in spa und spd gespeichert), nur einmal anzeigen und zählen
  const stats = $derived(
    gen1 ? STATS.filter((s) => s.key !== "spd").map((s) => (s.key === "spa" ? { ...s, label: "Spezial" } : s)) : STATS,
  );
  const total = $derived(stats.reduce((sum, s) => sum + pokemon.stats[s.key], 0));
  const abilities = $derived(pokemon.abilities.map((name, i) => ({ name, hidden: i === 2 })).filter((a) => a.name));

  const moveName = (id: number) => app.original?.movesById.get(id) ?? `#${id}`;
  const speciesName = (id: number) => app.data?.speciesById.get(id)?.name ?? `#${id}`;
  // "TM05" → tm-<typ>.png, "VM01" → hm-…, "TR12" → tr-…
  const DISC: Record<string, string> = { TM: "tm", VM: "hm", TR: "tr" };
  function disc(move: number): string | undefined {
    const label = app.original?.machines[move];
    const type = app.original?.machineTypes[move];
    return label && type && `/items/${DISC[label.slice(0, 2)]}-${type}.png`;
  }
  const evoText = (e: Evolution) => (e.method === "level" ? `Level ${e.value}` : e.value);

  type ChainRow = { id: number; depth: number; evo?: Evolution };
  // Ganze Reihe ab der Grundstufe, Verzweigungen (z. B. Evoli) eingerückt
  const chain = $derived.by(() => {
    const o = app.original;
    if (!o) return [];
    const seen = new Set([id]);
    let root = id;
    for (let pre = o.preEvolution.get(root); pre !== undefined && !seen.has(pre); pre = o.preEvolution.get(root)) {
      seen.add(pre);
      root = pre;
    }
    const rows: ChainRow[] = [];
    const walk = (row: ChainRow) => {
      rows.push(row);
      for (const e of o.pokemon[row.id]?.evolutions ?? []) {
        if (!rows.some((r) => r.id === e.target)) walk({ id: e.target, depth: row.depth + 1, evo: e });
      }
    };
    walk({ id: root, depth: 0 });
    return rows;
  });
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
      <StatBar {value} max={MAX} class={s.bar} />
    {/each}
    <span class="text-sm font-semibold">Summe</span>
    <span class="text-right text-sm font-semibold tabular-nums">{total}</span>
  </div>
{:else if category === "evolutions"}
  {#if chain.length > 1}
    <ul class="flex flex-col gap-1">
      {#each chain as row (row.id)}
        <!-- Pfeil unter der Sprite-Mitte der Vorstufe: je Stufe 3rem = Pfeil + Abstand + halber Sprite -->
        <li class="flex items-center gap-1" style:padding-left={row.depth ? `${(row.depth - 1) * 3 + 1.75}rem` : undefined}>
          {#if row.depth}
            <CornerDownRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {/if}
          <NavRow current={row.id === id} onclick={() => showSpecies(row.id)} class="min-w-0">
            <Sprite id={row.id} size={40} />
            <span class="font-medium">{speciesName(row.id)}</span>
            {#snippet meta()}{row.evo ? evoText(row.evo) : "Grundstufe"}{/snippet}
          </NavRow>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState variant="inline">Entwickelt sich in diesem Spiel nicht.</EmptyState>
  {/if}
{:else if category === "moves"}
  <div class="flex flex-col gap-4">
    <Section title="Level-Up">
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
    </Section>
    {#if pokemon.tmMoves.length || app.original?.tutor}
      <Section title={app.original?.tutor ? "Lehrer-Attacken" : "TM/VM"}>
        {#if app.original?.tutor}
          <Hint>PokeAPI hat für dieses Spiel kaum Lehrer-Daten, die Liste ist unvollständig.</Hint>
        {/if}
        <ul class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-3 text-sm">
          {#each pokemon.tmMoves as move (move)}
            {@const label = app.original?.machines[move]}
            <li class="flex min-w-0 items-center gap-2">
              {#if label}
                <ItemIcon src={disc(move)} />
                <span class="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">{label}</span>
              {/if}
              <span class="truncate">{moveName(move)}</span>
            </li>
          {/each}
        </ul>
      </Section>
    {/if}
  </div>
{/if}
