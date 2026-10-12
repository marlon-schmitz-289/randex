<script lang="ts">
  import { app, showSpecies } from "$lib/runs.svelte.ts";
  import { calcStats, itemName, levelOf, natureEffect, ownNickname } from "$lib/savegame.ts";
  import type { SavegameData, SaveMon, Stats } from "$lib/types.ts";
  import { STATS } from "./detail/StatsEditor.svelte";
  import Sprite from "./list/Sprite.svelte";

  const MOVE_SLOTS = [0, 1, 2, 3];

  /** `base` nur für Box-Pokémon nötig (Team-Werte stehen im Spielstand). */
  let { mon, data, base }: { mon: SaveMon; data: SavegameData; base?: Stats } = $props();

  const species = $derived(app.data?.speciesById.get(mon.speciesId)?.name ?? `#${mon.speciesId}`);
  const nick = $derived(ownNickname(mon, species));
  const level = $derived(levelOf(mon, data));
  const nature = $derived(natureEffect(mon.nature));
  const stats: Stats | undefined = $derived(
    mon.stats ? { ...mon.stats, hp: mon.stats.maxHp } : base && calcStats(base, mon, level),
  );
  const moveNames = $derived(new Map(app.data?.moves.map((m) => [m.id, m.name])));
</script>

<section class="panel flex flex-col">
  <div class="panel-header flex min-h-11 items-center gap-2 px-4 py-1.5 text-sm">
    <span class="truncate">{nick ?? species}</span>
    <span class="ml-auto shrink-0 tabular-nums">Lv. {level}</span>
  </div>
  <div class="flex flex-1 flex-col gap-3 p-3">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="shrink-0 rounded-md border border-panel-border bg-panel-inset hover:border-ring"
        title="{species} ansehen"
        onclick={() => showSpecies(mon.speciesId)}
      >
        <Sprite id={mon.speciesId} size={80} />
      </button>
      <dl class="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {#if nick}
          <dt class="text-muted-foreground">Art</dt>
          <dd class="truncate">{species}</dd>
        {/if}
        {#if mon.stats}
          <dt class="text-muted-foreground">KP</dt>
          <dd class="tabular-nums">{mon.stats.hp}/{mon.stats.maxHp}</dd>
        {/if}
        <dt class="text-muted-foreground">Wesen</dt>
        <dd class="truncate">{data.natures[mon.nature] ?? "?"}</dd>
        <dt class="text-muted-foreground">Item</dt>
        <dd class="truncate">{mon.item ? itemName(data, app.data?.game.generation ?? 0, mon.item) : "–"}</dd>
      </dl>
    </div>

    <table class="text-sm">
      <thead class="text-xs text-muted-foreground">
        <tr>
          <th class="text-left font-normal"><span class="sr-only">Wert</span></th>
          <th class="w-12 text-right font-normal">Wert</th>
          <th class="w-10 text-right font-normal">IV</th>
          <th class="w-10 text-right font-normal">EV</th>
        </tr>
      </thead>
      <tbody class="tabular-nums">
        {#each STATS as s (s.key)}
          <tr>
            <th scope="row" class="flex items-center gap-2 text-left font-normal">
              <span class={["size-2 rounded-full", s.bar]} aria-hidden="true"></span>
              {s.label}
              {#if nature.up === s.key}<span class="text-primary" title="durch Wesen erhöht">+</span>{/if}
              {#if nature.down === s.key}<span class="text-muted-foreground" title="durch Wesen gesenkt">−</span>{/if}
            </th>
            <td class="text-right font-semibold">{stats?.[s.key] ?? "–"}</td>
            <td class="text-right text-muted-foreground">{mon.ivs[s.key]}</td>
            <td class="text-right text-muted-foreground">{mon.evs[s.key]}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if !mon.stats}
      <p class="text-xs text-muted-foreground">
        {stats
          ? "Werte aus Basiswerten berechnet (Boxen speichern keine Werte)."
          : "Werte unbekannt: Stats sind randomisiert, aber für diese Art nicht eingetragen."}
      </p>
    {/if}

    <ul class="mt-auto grid grid-cols-2 gap-1 text-sm" aria-label="Attacken">
      {#each MOVE_SLOTS as i (i)}
        {@const move = mon.moves[i]}
        {#if move}
          <li class="truncate rounded-md border border-panel-border bg-panel-inset px-2 py-1">
            {moveNames.get(move) ?? `#${move}`}
          </li>
        {:else}
          <li class="rounded-md border border-dashed border-panel-border px-2 py-1 text-muted-foreground">
            –<span class="sr-only">Keine Attacke</span>
          </li>
        {/if}
      {/each}
    </ul>
  </div>
</section>
