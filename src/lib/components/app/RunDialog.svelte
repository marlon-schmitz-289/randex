<script lang="ts">
  import { untrack } from "svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { categoriesForGeneration } from "$lib/data.ts";
  import { app, createRun, DEFAULT_CATEGORIES, updateRunMeta } from "$lib/runs.svelte.ts";
  import { CATEGORY_LABELS, WILD_MATCHING_LABELS, type Category, type Game, type Run, type WildMatching } from "$lib/types.ts";

  let { open = $bindable(false), run }: { open?: boolean; run?: Run } = $props();

  let name = $state("");
  let gameId = $state("");
  let seed = $state("");
  let note = $state("");
  let categories = $state<Category[]>([]);
  let matching = $state<WildMatching | "off">("off");
  let busy = $state(false);

  const groups = $derived.by(() => {
    const byGen = new Map<number, Game[]>();
    for (const g of app.games) byGen.set(g.generation, [...(byGen.get(g.generation) ?? []), g]);
    return [...byGen];
  });
  const game = $derived(app.games.find((g) => g.id === gameId));
  const allowed = $derived(game ? categoriesForGeneration(game.generation) : []);
  const valid = $derived(name.trim() !== "" && game !== undefined);

  // Bei jedem Öffnen neu befüllen; untrack, damit run-Änderungen laufende Eingaben nicht überschreiben.
  $effect(() => {
    if (!open) return;
    untrack(() => {
      name = run?.name ?? "";
      gameId = run?.gameId ?? "";
      seed = run?.seed ?? "";
      note = run?.note ?? "";
      categories = [...(run?.enabledCategories ?? DEFAULT_CATEGORIES)];
      matching = run?.wildMatching ?? "off";
    });
  });

  function toggle(c: Category, on: boolean) {
    categories = on ? [...categories, c] : categories.filter((x) => x !== c);
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    busy = true;
    const input = {
      name: name.trim(),
      gameId,
      seed: seed.trim() || undefined,
      note: note.trim() || undefined,
      enabledCategories: categories.filter((c) => allowed.includes(c)),
      wildMatching: matching === "off" ? undefined : matching,
    };
    if (await (run ? updateRunMeta(input) : createRun(input))) open = false;
    busy = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <form class="grid gap-4" onsubmit={submit}>
      <Dialog.Header>
        <Dialog.Title>{run ? "Run bearbeiten" : "Neuer Run"}</Dialog.Title>
        <Dialog.Description>
          Das Spiel legt Pokémon, Typen, Attacken und Routen fest.
        </Dialog.Description>
      </Dialog.Header>

      <div class="grid gap-1.5">
        <Label for="run-name">Name</Label>
        <Input id="run-name" bind:value={name} placeholder="z. B. Nuzlocke Schwarz" required />
      </div>

      <div class="grid gap-1.5">
        <Label for="run-game">Spiel</Label>
        <Select.Root type="single" bind:value={gameId}>
          <Select.Trigger id="run-game" class="w-full" aria-required="true">
            {game ? `${game.name} (${game.region})` : "Spiel wählen"}
          </Select.Trigger>
          <Select.Content class="max-h-80">
            {#each groups as [gen, list] (gen)}
              <Select.Group>
                <Select.GroupHeading>Generation {gen}</Select.GroupHeading>
                {#each list as g (g.id)}
                  <Select.Item value={g.id} label={g.name}>{g.name}</Select.Item>
                {/each}
              </Select.Group>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if run && gameId !== run.gameId}
          <p class="text-xs text-muted-foreground">
            Einträge bleiben erhalten, Pokémon und Routen richten sich nach dem neuen Spiel.
            Encounter auf Routen, die es dort nicht gibt, werden ausgeblendet und erscheinen erst nach
            einem Zurückwechseln wieder.
          </p>
        {/if}
      </div>

      <div class="grid gap-1.5">
        <Label for="run-seed">Seed <span class="text-muted-foreground">(optional)</span></Label>
        <Input id="run-seed" bind:value={seed} />
      </div>

      <div class="grid gap-1.5">
        <Label for="run-matching">Wilde Pokémon</Label>
        <Select.Root type="single" bind:value={matching}>
          <Select.Trigger id="run-matching" class="w-full">
            {matching === "off" ? "Keine Zuordnung" : WILD_MATCHING_LABELS[matching]}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="off" label="Keine Zuordnung">Keine Zuordnung</Select.Item>
            {#each Object.entries(WILD_MATCHING_LABELS) as [value, label] (value)}
              <Select.Item {value} {label}>{label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <p class="text-xs text-muted-foreground">
          Wie im Randomizer eingestellt. Bei 1:1 zeigen die Routen pro Methode, wie viele Pokémon es dort gibt (z. B. 2/3).
        </p>
      </div>

      <div class="grid gap-1.5">
        <Label for="run-note">Notiz <span class="text-muted-foreground">(optional)</span></Label>
        <Textarea id="run-note" bind:value={note} rows={2} />
      </div>

      {#if allowed.length}
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">Kategorien</legend>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2">
            {#each allowed as c (c)}
              <div class="flex items-center gap-2">
                <Switch
                  id="run-cat-{c}"
                  checked={categories.includes(c)}
                  onCheckedChange={(on) => toggle(c, on)}
                />
                <Label for="run-cat-{c}" class="font-normal">{CATEGORY_LABELS[c]}</Label>
              </div>
            {/each}
          </div>
        </fieldset>
      {/if}

      <Dialog.Footer>
        <Button variant="outline" onclick={() => (open = false)}>Abbrechen</Button>
        <Button type="submit" disabled={!valid || busy}>{run ? "Speichern" : "Anlegen"}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
