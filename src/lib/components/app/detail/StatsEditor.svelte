<script lang="ts" module>
  import type { Stats } from "$lib/types.ts";

  export const STATS: { key: keyof Stats; label: string; short: string; bar: string }[] = [
    { key: "hp", label: "KP", short: "KP", bar: "bg-stat-hp" },
    { key: "atk", label: "Angriff", short: "Angr.", bar: "bg-stat-atk" },
    { key: "def", label: "Verteidigung", short: "Vert.", bar: "bg-stat-def" },
    { key: "spa", label: "Sp.-Angriff", short: "Sp.-A.", bar: "bg-stat-spa" },
    { key: "spd", label: "Sp.-Verteidigung", short: "Sp.-V.", bar: "bg-stat-spd" },
    { key: "spe", label: "Initiative", short: "Init.", bar: "bg-stat-spe" },
  ];
  export const MAX = 255;
</script>

<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { StatBar } from "$lib/components/kit";
  import { updateEntry } from "$lib/runs.svelte.ts";
  import type { PokemonEntry } from "$lib/types.ts";

  let { speciesId, entry }: { speciesId: number; entry: PokemonEntry } = $props();

  const stats = $derived(entry.stats);
  const total = $derived(stats ? STATS.reduce((sum, s) => sum + stats[s.key], 0) : 0);

  function set(key: keyof Stats, raw: number) {
    const value = Math.min(MAX, Math.max(0, Math.round(raw) || 0));
    const next: Stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...stats, [key]: value };
    const empty = STATS.every((s) => next[s.key] === 0);
    updateEntry(speciesId, { stats: empty ? undefined : next });
  }
</script>

<div class="grid grid-cols-[auto_4.5rem_1fr] items-center gap-x-3 gap-y-1.5" role="group" aria-label="Basiswerte">
  {#each STATS as s (s.key)}
    {@const value = stats?.[s.key] ?? 0}
    <label for="stat-{s.key}" class="text-sm">{s.label}</label>
    <Input
      id="stat-{s.key}"
      type="number"
      min={0}
      max={MAX}
      value={stats ? value : ""}
      class="h-7 text-right tabular-nums"
      onchange={(e) => set(s.key, e.currentTarget.valueAsNumber)}
    />
    <StatBar {value} max={MAX} class={s.bar} />
  {/each}
  <span class="text-sm font-semibold">Summe</span>
  <span class="pr-3 text-right text-sm font-semibold tabular-nums">{total}</span>
</div>
