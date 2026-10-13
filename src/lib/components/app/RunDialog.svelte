<script lang="ts">
  import { untrack } from "svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Field, SwitchField } from "$lib/components/kit";
  import { categoriesForGeneration } from "$lib/data.ts";
  import { app, createRun, DEFAULT_CATEGORIES, updateRunMeta } from "$lib/runs.svelte.ts";
  import { CATEGORY_LABELS, SAVE_GAMES, WILD_MATCHING_LABELS, type Category, type Game, type Run, type WildMatching } from "$lib/types.ts";

  let { open = $bindable(false), run }: { open?: boolean; run?: Run } = $props();

  let name = $state("");
  let gameId = $state("");
  let seed = $state("");
  let note = $state("");
  let categories = $state<Category[]>([]);
  let matching = $state<WildMatching | "off">("off");
  let randomized = $state(true);
  let saveGame = $state(false);
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
      randomized = run?.randomized !== false;
      saveGame = run?.saveGame === true;
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
      randomized: randomized ? undefined : (false as const),
      saveGame: saveGame && SAVE_GAMES.has(gameId) ? (true as const) : undefined,
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

      <Field label="Name" for="run-name">
        <Input id="run-name" bind:value={name} placeholder="z. B. Nuzlocke Schwarz" required />
      </Field>

      <Field
        label="Spiel"
        for="run-game"
        hint={run && gameId !== run.gameId
          ? "Einträge bleiben erhalten, Pokémon und Routen richten sich nach dem neuen Spiel. Encounter auf Routen, die es dort nicht gibt, werden ausgeblendet und erscheinen erst nach einem Zurückwechseln wieder."
          : undefined}
      >
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
      </Field>

      <Field label="Seed" for="run-seed" optional>
        <Input id="run-seed" bind:value={seed} />
      </Field>

      <SwitchField
        id="run-randomized"
        label="Randomizer-Run"
        bind:checked={randomized}
        hint="Aus: Originaldaten des Spiels nachschlagen statt eintragen."
      />

      {#if SAVE_GAMES.has(gameId)}
        <SwitchField
          id="run-save"
          label="Spielstand einlesen"
          bind:checked={saveGame}
          hint="Zeigt Team mit Werten, Boxen und Beutel aus der Spielstand-Datei des Emulators."
        />
      {/if}

      {#if randomized}
        <Field
          label="Wilde Pokémon"
          for="run-matching"
          hint="Wie im Randomizer eingestellt. Bei 1:1 zeigen die Routen pro Methode, wie viele Pokémon es dort gibt (z. B. 2/3)."
        >
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
        </Field>
      {/if}

      <Field label="Notiz" for="run-note" optional>
        <Textarea id="run-note" bind:value={note} rows={2} />
      </Field>

      {#if randomized && allowed.length}
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">Kategorien</legend>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2">
            {#each allowed as c (c)}
              <SwitchField
                id="run-cat-{c}"
                label={CATEGORY_LABELS[c]}
                bind:checked={() => categories.includes(c), (on) => toggle(c, on)}
              />
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
