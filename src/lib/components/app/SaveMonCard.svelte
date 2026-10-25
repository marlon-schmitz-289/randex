<script lang="ts">
  import { app, showSpecies } from "$lib/runs.svelte.ts";
  import { calcStats, calcStatsGb, itemIcon, itemName, levelOf, natureEffect, ownNickname } from "$lib/savegame.ts";
  import { Hint, Panel, StatBar } from "$lib/components/kit";
  import type { SavegameData, SaveMon, Stats } from "$lib/types.ts";
  import { STATS } from "./detail/StatsEditor.svelte";
  import ItemIcon from "./ItemIcon.svelte";
  import Sprite from "./list/Sprite.svelte";

  const MOVE_SLOTS = [0, 1, 2, 3];

  /** `base` nur für Box-Pokémon nötig (Team-Werte stehen im Spielstand). */
  let { mon, data, base }: { mon: SaveMon; data: SavegameData; base?: Stats } = $props();

  const generation = $derived(app.data?.game.generation ?? 0);
  // Gen 1/2: DVs (0–15) und Stat-EXP statt IVs und EVs
  const gb = $derived(generation <= 2);
  const species = $derived(app.data?.speciesById.get(mon.speciesId)?.name ?? `#${mon.speciesId}`);
  const nick = $derived(ownNickname(mon, species));
  const level = $derived(levelOf(mon, data));
  const nature = $derived(natureEffect(mon.nature));
  const stats: Stats | undefined = $derived(
    mon.stats ? { ...mon.stats, hp: mon.stats.maxHp } : base && (gb ? calcStatsGb : calcStats)(base, mon, level),
  );
  const moveNames = $derived(new Map(app.data?.moves.map((m) => [m.id, m.name])));
  const top = $derived(stats ? Math.max(...STATS.map((s) => stats[s.key])) : 1);
</script>

<!-- Container: Schrift wächst mit der Kartenbreite, Statzeilen mit der Höhe -->
<Panel title={nick ?? species} class="@container min-w-0" bodyClass="flex flex-col gap-2 @lg:gap-3">
  {#snippet actions()}{#if nick}<span class="font-normal">{species} ·</span>{/if} Lv. {level}{/snippet}
  <div class="flex items-center gap-3">
    <button
      type="button"
      data-species={mon.speciesId}
      class="shrink-0 rounded-md border border-panel-border bg-panel-inset hover:border-ring"
      title="{species} ansehen"
      onclick={() => showSpecies(mon.speciesId)}
    >
      <Sprite id={mon.speciesId} size={44} />
    </button>
    <!-- Feste Zellen (Wert unter Beschriftung), damit alle Karten gleich aufgebaut sind -->
    <dl class="grid min-w-0 flex-1 grid-cols-3 gap-2 text-sm leading-tight @lg:text-base">
      <div class="min-w-0">
        <dt class="text-xs text-muted-foreground">KP</dt>
        <dd class="tabular-nums">{mon.stats ? `${mon.stats.hp}/${mon.stats.maxHp}` : "–"}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-muted-foreground">Wesen</dt>
        <dd class="truncate">{mon.nature === undefined ? "–" : (data.natures[mon.nature] ?? "?")}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-muted-foreground">Item</dt>
        <dd class="flex min-w-0 items-center gap-1">
          {#if mon.item}
            <ItemIcon class="-my-2 size-6" src={itemIcon(data, generation, mon.item)} />
            <span class="truncate">{itemName(data, generation, mon.item)}</span>
          {:else}–{/if}
        </dd>
      </div>
    </dl>
  </div>

  <!-- Balken relativ zum höchsten Wert; flex-1 verteilt freie Höhe auf die Zeilen.
       Balkenspalte w-full drückt die Zahlenspalten auf Inhaltsbreite: Abstand nur über pl-2 je Zelle. -->
  <table class="w-full flex-1 text-xs leading-4 tabular-nums @lg:text-sm">
    <thead class="text-muted-foreground">
      <tr>
        <th class="text-left font-normal"><span class="sr-only">Wert</span></th>
        <th class="w-full"><span class="sr-only">Balken</span></th>
        <th class="pl-2 text-right font-normal">Wert</th>
        <th class="pl-2 text-right font-normal">{gb ? "DV" : "IV"}</th>
        <th class="pl-2 text-right font-normal">{gb ? "EP" : "EV"}</th>
      </tr>
    </thead>
    <tbody>
      {#each STATS as s (s.key)}
        <tr>
          <th scope="row" class="pr-2 text-left font-normal whitespace-nowrap" title={s.label}>
            {s.short}{#if nature.up === s.key}<span class="text-primary" title="durch Wesen erhöht"> +</span>{/if}{#if nature.down === s.key}<span
                class="text-muted-foreground"
                title="durch Wesen gesenkt"> −</span
              >{/if}
          </th>
          <td>
            {#if stats}<StatBar value={stats[s.key]} max={top} class={s.bar} />{/if}
          </td>
          <td class="pl-2 text-right text-sm font-semibold @lg:text-base">{stats?.[s.key] ?? "–"}</td>
          <td class="pl-2 text-right text-muted-foreground">{mon.ivs[s.key]}</td>
          <td class="pl-2 text-right text-muted-foreground">{mon.evs[s.key]}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if !mon.stats}
    <Hint>
      {stats
        ? "Werte aus Basiswerten berechnet (Boxen speichern keine Werte)."
        : "Werte unbekannt: Stats sind randomisiert, aber für diese Art nicht eingetragen."}
    </Hint>
  {/if}

  <ul class="grid grid-cols-2 gap-1 text-xs @lg:text-sm" aria-label="Attacken">
    {#each MOVE_SLOTS as i (i)}
      {@const move = mon.moves[i]}
      {#if move}
        <li class="truncate rounded-md border border-panel-border bg-panel-inset px-2 py-0.5">
          {moveNames.get(move) ?? `#${move}`}
        </li>
      {:else}
        <li class="rounded-md border border-dashed border-panel-border px-2 py-0.5 text-muted-foreground">
          –<span class="sr-only">Keine Attacke</span>
        </li>
      {/if}
    {/each}
  </ul>
</Panel>
