<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Import from "@lucide/svelte/icons/import";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { loadOriginal, loadSavegameData } from "$lib/data.ts";
  import { app, importSave } from "$lib/runs.svelte.ts";
  import { itemName, levelOf, ownNickname, POCKET_LABELS } from "$lib/savegame.ts";
  import type { SaveMon, Stats } from "$lib/types.ts";
  import Sprite from "./list/Sprite.svelte";
  import SaveMonCard from "./SaveMonCard.svelte";

  let tab = $state("team");
  // Auswahl gilt nur für den Spielstand, in dem sie getroffen wurde; sonst erste belegte Box bzw. erster Platz.
  let chosen = $state<{ readAt: number; index: number } | null>(null);
  let picked = $state<{ readAt: number; box: number; slot: number } | null>(null);

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
      <Tabs.Trigger value="team">Team</Tabs.Trigger>
      <Tabs.Trigger value="boxes">Boxen</Tabs.Trigger>
      <Tabs.Trigger value="bag">Beutel</Tabs.Trigger>
    </Tabs.List>
    {#if save}<span class="text-xs text-muted-foreground">Stand: {readAt(save.readAt)}</span>{/if}
    <Button class="ml-auto" title="Spielstand-Datei des Emulators wählen (.sav, .dsv, .srm)" onclick={importSave}>
      <Import /> Spielstand laden
    </Button>
  </div>

  {#if !save}
    <section class="panel">
      <h2 class="panel-header px-4 py-2 text-sm">Noch kein Spielstand</h2>
      <p class="p-4 text-sm text-muted-foreground">
        Im Spiel speichern, dann „Spielstand laden“ und die Datei des Emulators wählen (mGBA/melonDS: .sav,
        DeSmuME: .dsv, RetroArch: .srm). Team und Orden im Fortschritt werden dabei übernommen.
      </p>
    </section>
  {:else}
    {#await loaded then [data, original]}
      <Tabs.Content value="team" class="min-h-0 overflow-y-auto">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-3">
          {#each save.team as mon, i (i)}
            <SaveMonCard {mon} {data} />
          {:else}
            <p class="text-sm text-muted-foreground">Kein Pokémon im Team.</p>
          {/each}
        </div>
      </Tabs.Content>

      <Tabs.Content value="boxes" class="min-h-0 flex-1 overflow-y-auto">
        <div class="grid min-h-full items-start gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section class="panel flex h-full min-h-[30rem] flex-col">
            <div class="panel-header flex items-center gap-2 px-2 py-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                class="hover:bg-panel-header-foreground/15 hover:text-panel-header-foreground dark:hover:bg-panel-header-foreground/15"
                aria-label="Vorherige Box" onclick={() => stepBox(-1)}>
                <ChevronLeft />
              </Button>
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
              <Button
                variant="ghost"
                size="icon-sm"
                class="hover:bg-panel-header-foreground/15 hover:text-panel-header-foreground dark:hover:bg-panel-header-foreground/15"
                aria-label="Nächste Box" onclick={() => stepBox(1)}>
                <ChevronRight />
              </Button>
            </div>
            <ul class="grid flex-1 grid-cols-6 grid-rows-5 gap-2 p-3" aria-label={boxName(boxIndex)}>
              {#each box?.mons ?? [] as mon, i (i)}
                <li class="rounded-md bg-panel-inset/50">
                  {#if mon}
                    {@const level = levelOf(mon, data)}
                    <button
                      type="button"
                      class={[
                        "flex size-full flex-col items-center justify-center rounded-md border-2 hover:border-ring",
                        i === slot ? "border-primary bg-accent text-accent-foreground" : "border-panel-border/40 bg-panel-inset",
                      ]}
                      title={title(mon, level)}
                      aria-label={title(mon, level)}
                      aria-pressed={i === slot}
                      onclick={() => save && (picked = { readAt: save.readAt, box: boxIndex, slot: i })}
                    >
                      <Sprite id={mon.speciesId} size={80} />
                      <span class="text-xs tabular-nums">Lv. {level}</span>
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          </section>
          {#if selected}
            <SaveMonCard mon={selected} {data} base={baseStats(selected.speciesId, original)} />
          {:else}
            <p class="text-sm text-muted-foreground">Diese Box ist leer.</p>
          {/if}
        </div>
      </Tabs.Content>

      <Tabs.Content value="bag" class="min-h-0 overflow-y-auto">
        <div class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] items-start gap-3">
          {#each save.bag as pocket (pocket.id)}
            <section class="panel">
              <h2 class="panel-header px-4 py-1.5 text-sm">{POCKET_LABELS[pocket.id]} ({pocket.items.length})</h2>
              {#if pocket.items.length}
                <ul class="grid gap-0.5 p-3 text-sm">
                  {#each pocket.items as [item, count], i (i)}
                    <li class="flex gap-2">
                      <span class="truncate">{itemName(data, generation, item)}</span>
                      <span class="ml-auto text-muted-foreground tabular-nums">×{count}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="p-3 text-sm text-muted-foreground">Leer</p>
              {/if}
            </section>
          {/each}
        </div>
      </Tabs.Content>
    {:catch e}
      <p class="text-sm text-muted-foreground">Daten konnten nicht geladen werden: {e instanceof Error ? e.message : e}</p>
    {/await}
  {/if}
</Tabs.Root>
