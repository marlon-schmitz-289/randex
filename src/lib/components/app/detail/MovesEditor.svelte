<script lang="ts">
  import XIcon from "@lucide/svelte/icons/x";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { app, updateEntry } from "$lib/runs.svelte.ts";
  import type { LevelMove, PokemonEntry } from "$lib/types.ts";
  import NamePicker from "./NamePicker.svelte";

  let { speciesId, entry }: { speciesId: number; entry: PokemonEntry } = $props();

  const moves = $derived(app.data?.moves ?? []);
  const levelMoves = $derived(entry.levelMoves ?? []);
  const tmMoves = $derived(entry.tmMoves ?? []);
  let newLevel = $state(1);

  const clampLevel = (v: number) => Math.min(100, Math.max(1, Math.round(v) || 1));

  // Nur beim Hinzufügen sortieren: Zeilen sind per Index gekeyt, Umsortieren verschöbe den Fokus.
  function setLevelMoves(list: LevelMove[]) {
    updateEntry(speciesId, { levelMoves: list.length ? list : undefined });
  }

  function setTmMoves(list: string[]) {
    updateEntry(speciesId, { tmMoves: list.length ? list : undefined });
  }
</script>

<div class="flex flex-col gap-4">
  <section class="flex flex-col gap-2" aria-labelledby="moves-level">
    <h3 id="moves-level" class="text-sm font-semibold text-muted-foreground">Level-Up</h3>
    {#each levelMoves as lm, i (i)}
      <div class="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={100}
          value={lm.level}
          aria-label="Level von {lm.move}"
          class="w-20 shrink-0"
          onchange={(e) =>
            setLevelMoves(levelMoves.map((m, j) => (j === i ? { ...m, level: clampLevel(e.currentTarget.valueAsNumber) } : m)))}
        />
        <NamePicker
          items={moves}
          value={lm.move}
          label="Attacke {i + 1}"
          onSelect={(move) => setLevelMoves(levelMoves.map((m, j) => (j === i ? { ...m, move } : m)))}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="{lm.move} entfernen"
          onclick={() => setLevelMoves(levelMoves.filter((_, j) => j !== i))}
        >
          <XIcon />
        </Button>
      </div>
    {/each}
    <div class="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        max={100}
        bind:value={newLevel}
        aria-label="Level der neuen Attacke"
        class="w-20 shrink-0"
      />
      <NamePicker
        items={moves}
        value=""
        placeholder="Attacke hinzufügen …"
        onSelect={(move) =>
          setLevelMoves([...levelMoves, { level: clampLevel(newLevel), move }].sort((a, b) => a.level - b.level))}
      />
      <span class="size-8 shrink-0"></span>
    </div>
  </section>

  <section class="flex flex-col gap-2" aria-labelledby="moves-tm">
    <h3 id="moves-tm" class="text-sm font-semibold text-muted-foreground">TM/VM</h3>
    {#if tmMoves.length}
      <ul class="flex flex-wrap gap-1.5">
        {#each tmMoves as move, i (i)}
          <li class="flex items-center gap-1 rounded-md border border-border bg-secondary py-0.5 pr-0.5 pl-2 text-sm text-secondary-foreground">
            {move}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="{move} entfernen"
              onclick={() => setTmMoves(tmMoves.filter((_, j) => j !== i))}
            >
              <XIcon />
            </Button>
          </li>
        {/each}
      </ul>
    {/if}
    <NamePicker
      items={moves}
      value=""
      placeholder="TM/VM-Attacke hinzufügen …"
      onSelect={(move) => !tmMoves.includes(move) && setTmMoves([...tmMoves, move])}
    />
  </section>
</div>
