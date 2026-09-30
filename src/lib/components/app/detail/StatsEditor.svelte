<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { updateEntry } from "$lib/runs.svelte.ts";
  import type { PokemonEntry, Stats } from "$lib/types.ts";

  let { speciesId, entry }: { speciesId: number; entry: PokemonEntry } = $props();

  const STATS: { key: keyof Stats; label: string; bar: string }[] = [
    { key: "hp", label: "KP", bar: "bg-stat-hp" },
    { key: "atk", label: "Angriff", bar: "bg-stat-atk" },
    { key: "def", label: "Verteidigung", bar: "bg-stat-def" },
    { key: "spa", label: "Sp.-Angriff", bar: "bg-stat-spa" },
    { key: "spd", label: "Sp.-Verteidigung", bar: "bg-stat-spd" },
    { key: "spe", label: "Initiative", bar: "bg-stat-spe" },
  ];
  const MAX = 255;

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
    <div class="h-2.5 overflow-hidden rounded-full bg-stat-track" aria-hidden="true">
      <div class={["h-full rounded-full", s.bar]} style:width="{(value / MAX) * 100}%"></div>
    </div>
  {/each}
  <span class="text-sm font-semibold">Summe</span>
  <span class="pr-3 text-right text-sm font-semibold tabular-nums">{total}</span>
</div>
