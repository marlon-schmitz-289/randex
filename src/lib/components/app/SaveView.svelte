<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Import from "@lucide/svelte/icons/import";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { EmptyState, Hint, IconButton, Panel, SegmentItem, SelectCard, TabTrigger } from "$lib/components/kit";
  import { loadOriginal, loadSavegameData } from "$lib/data.ts";
  import { app, importSave } from "$lib/runs.svelte.ts";
  import { itemIcon, itemName, levelOf, ownNickname, POCKET_LABELS } from "$lib/savegame.ts";
  import type { PocketId, SaveMon, Stats } from "$lib/types.ts";
  import ItemIcon from "./ItemIcon.svelte";
  import Sprite from "./list/Sprite.svelte";
  import SaveMonCard from "./SaveMonCard.svelte";

  let tab = $state("team");
  // Auswahl gilt nur für den Spielstand, in dem sie getroffen wurde; sonst erste belegte Box bzw. erster Platz.
  let chosen = $state<{ readAt: number; index: number } | null>(null);
  let picked = $state<{ readAt: number; box: number; slot: number } | null>(null);
  let pocketId = $state<PocketId | null>(null);

  const save = $derived(app.current?.save);
  const generation = $derived(app.data?.game.generation ?? 0);
  const boxIndex = $derived(
    chosen && chosen.readAt === save?.readAt ? chosen.index : Math.max(0, save?.boxes.findIndex((b) => b.mons.some(Boolean)) ?? 0),
  );
  const box = $derived(save?.boxes[boxIndex]);
  const slot = $derived(
    picked && picked.readAt === save?.readAt && picked.box === boxIndex ? picked.slot : (box?.mons.findIndex(Boolean) ?? -1),
  );
  const selected = $derived(box?.mons[slot] ?? null);
  // Ohne Wahl die erste Tasche mit Inhalt
  const pocket = $derived(save?.bag.find((p) => p.id === pocketId) ?? save?.bag.find((p) => p.items.length) ?? save?.bag[0]);
  const loaded = $derived(Promise.all([loadSavegameData(), app.current ? loadOriginal(app.current.gameId) : null]));
  // Randomisierte Stats nur aus dem Eintrag, sonst Originalwerte des Spiels
  const statsRandomized = $derived(app.current?.randomized !== false && app.current?.enabledCategories.includes("stats"));

  const speciesName = (id: number) => app.data?.speciesById.get(id)?.name ?? `#${id}`;
  // Ungesetzte Namen sind in Gen 3 Leerzeichen
  const boxName = (i: number) => save?.boxes[i]?.name.trim() || `Box ${i + 1}`;
  const readAt = (ms: number) => new Date(ms).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

  function title(mon: SaveMon, level: number) {
    const nick = ownNickname(mon, speciesName(mon.speciesId));
    return `${nick ? `${nick} (${speciesName(mon.speciesId)})` : speciesName(mon.speciesId)}, Lv. ${level}`;
  }

  const baseStats = (id: number, original: { pokemon: Record<number, { stats: Stats }> } | null): Stats | undefined =>
    app.current?.pokemon[id]?.stats ?? (statsRandomized ? undefined : original?.pokemon[id]?.stats);

  /** Attacke einer TM/VM laut Item-Name („TM24“) aus den Originaldaten; mit Randomizer evtl. anders belegt */
  function machineMove(name: string, original: { machines: Record<number, string> } | null): string | undefined {
    if (app.current?.randomized !== false) return undefined;
    const id = Object.entries(original?.machines ?? {}).find(([, label]) => label === name)?.[0];
    return id ? app.data?.moves.find((m) => m.id === Number(id))?.name : undefined;
  }

  function selectBox(index: number) {
    if (save) chosen = { readAt: save.readAt, index };
  }

  function stepBox(delta: number) {
    const count = save?.boxes.length ?? 0;
    if (count) selectBox((boxIndex + delta + count) % count);
  }
</script>

<Tabs.Root bind:value={tab} class="flex h-full min-h-0 flex-col gap-3">
  <div class="flex flex-wrap items-center gap-3">
    <Tabs.List aria-label="Spielstand">
      <TabTrigger value="team">Team</TabTrigger>
      <TabTrigger value="boxes">Boxen</TabTrigger>
      <TabTrigger value="bag">Beutel</TabTrigger>
    </Tabs.List>
    {#if save}<Hint>Stand: {readAt(save.readAt)}</Hint>{/if}
    <Button class="ml-auto" title="Spielstand-Datei des Emulators wählen (.sav, .dsv, .srm)" onclick={importSave}>
      <Import /> Spielstand laden
    </Button>
  </div>

  {#if !save}
    <Panel title="Noch kein Spielstand" flush>
      <EmptyState>
        Im Spiel speichern, dann „Spielstand laden“ und die Datei des Emulators wählen (mGBA/melonDS: .sav,
        DeSmuME: .dsv, RetroArch: .srm). Übernommen werden Team, Orden, VMs, Name, Geld und
        Spielzeit in den Fortschritt sowie gefangene Pokémon in den Pokédex.
      </EmptyState>
    </Panel>
  {:else}
    {#await loaded then [data, original]}
      <Tabs.Content value="team" class="min-h-0 flex-1 overflow-y-auto">
        <!-- Zwei Reihen füllen die Höhe; reicht sie nicht, bestimmt der Inhalt die Höhe und es scrollt -->
        <div class="grid min-h-full grid-cols-3 grid-rows-[repeat(2,minmax(min-content,1fr))] gap-3">
          {#each save.team as mon, i (i)}
            <SaveMonCard {mon} {data} />
          {:else}
            <EmptyState variant="inline">Kein Pokémon im Team.</EmptyState>
          {/each}
        </div>
      </Tabs.Content>

      <Tabs.Content value="boxes" class="min-h-0 flex-1 overflow-y-auto">
        <div class="grid min-h-full items-start gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Panel class="h-full min-h-[30rem]" bodyClass="flex">
            {#snippet header()}
              <IconButton size="icon-sm" onHeader label="Vorherige Box" onclick={() => stepBox(-1)}>
                <ChevronLeft />
              </IconButton>
              <Select.Root type="single" value={String(boxIndex)} onValueChange={(v) => selectBox(Number(v))}>
                <Select.Trigger
                  class="mx-auto h-7 w-auto min-w-40 justify-center gap-2 border-0 bg-transparent font-semibold text-panel-header-foreground shadow-none hover:bg-panel-header-foreground/15 dark:bg-transparent dark:hover:bg-panel-header-foreground/15 [&_svg]:text-panel-header-foreground!"
                  aria-label="Box wählen"
                >
                  {boxName(boxIndex)}
                  <span class="font-normal opacity-80">{box?.mons.filter(Boolean).length ?? 0}/30</span>
                </Select.Trigger>
                <Select.Content class="max-h-80">
                  {#each save.boxes as b, i (i)}
                    <Select.Item value={String(i)} label={boxName(i)}>
                      {boxName(i)}
                      <span class="ml-auto text-xs text-muted-foreground">{b.mons.filter(Boolean).length}/30</span>
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <IconButton size="icon-sm" onHeader label="Nächste Box" onclick={() => stepBox(1)}>
                <ChevronRight />
              </IconButton>
            {/snippet}
            <ul class="grid flex-1 grid-cols-6 grid-rows-5 gap-2" aria-label={boxName(boxIndex)}>
              {#each box?.mons ?? [] as mon, i (i)}
                {@const level = mon && levelOf(mon, data)}
                <li class="rounded-md bg-panel-inset/50">
                  {#if mon}
                    <SelectCard
                      class="flex size-full flex-col items-center justify-center"
                      label={title(mon, level ?? 0)}
                      pressed={i === slot}
                      onclick={() => save && (picked = { readAt: save.readAt, box: boxIndex, slot: i })}
                    >
                      <Sprite id={mon.speciesId} size={80} />
                      <span class="text-xs tabular-nums">Lv. {level}</span>
                    </SelectCard>
                  {/if}
                </li>
              {/each}
            </ul>
          </Panel>
          {#if selected}
            <SaveMonCard mon={selected} {data} base={baseStats(selected.speciesId, original)} />
          {:else}
            <EmptyState variant="inline">Diese Box ist leer.</EmptyState>
          {/if}
        </div>
      </Tabs.Content>

      <Tabs.Content value="bag" class="flex min-h-0 flex-1 flex-col gap-3">
        <ToggleGroup.Root
          type="single"
          variant="outline"
          size="sm"
          class="flex-wrap"
          value={pocket?.id}
          onValueChange={(v) => v && (pocketId = v as PocketId)}
          aria-label="Tasche"
        >
          {#each save.bag as p (p.id)}
            <SegmentItem value={p.id}>
              {POCKET_LABELS[p.id]} <span class="tabular-nums opacity-70">{p.items.length}</span>
            </SegmentItem>
          {/each}
        </ToggleGroup.Root>
        {#if pocket}
          <Panel title={POCKET_LABELS[pocket.id]} class="min-h-0 flex-1" bodyClass="overflow-y-auto">
            {#snippet actions()}{pocket.items.length} Items{/snippet}
            {#if pocket.items.length}
              <ul class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2 text-sm">
                {#each pocket.items as [item, count], i (i)}
                  {@const name = itemName(data, generation, item)}
                  {@const move = machineMove(name, original)}
                  <li class="flex items-center gap-3 rounded-md border border-panel-border bg-panel-inset/50 py-1 pr-3 pl-1">
                    <ItemIcon src={itemIcon(data, generation, item)} />
                    <span class="min-w-0 flex-1 truncate">
                      {name}{#if move}<span class="text-muted-foreground"> · {move}</span>{/if}
                    </span>
                    <span class="text-muted-foreground tabular-nums">×{count}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <EmptyState variant="inline">Diese Tasche ist leer.</EmptyState>
            {/if}
          </Panel>
        {/if}
      </Tabs.Content>
    {:catch e}
      <EmptyState variant="inline">Daten konnten nicht geladen werden: {e instanceof Error ? e.message : e}</EmptyState>
    {/await}
  {/if}
</Tabs.Root>
