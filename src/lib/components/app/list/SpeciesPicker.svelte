<script lang="ts">
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { app } from "$lib/runs.svelte.ts";
  import { searchSpecies } from "$lib/search.ts";
  import Sprite from "./Sprite.svelte";

  let {
    value = null,
    onSelect,
    allowFreeText = false,
    exclude = [],
    placeholder = "Pokémon wählen",
    label: ariaLabel,
  }: {
    value?: number | string | null;
    onSelect: (v: number | string) => void;
    allowFreeText?: boolean;
    exclude?: number[];
    placeholder?: string;
    label?: string;
  } = $props();

  // reicht zum Tippen-und-Wählen
  const MAX = 60;
  let open = $state(false);
  let query = $state("");

  const label = $derived(
    typeof value === "number" ? (app.data?.speciesById.get(value)?.name ?? `#${value}`) : (value ?? ""),
  );
  const matches = $derived(
    app.data
      ? searchSpecies(app.data.species, null, { query, filter: "all", type: null }).filter((s) => !exclude.includes(s.id))
      : [],
  );
  const results = $derived(matches.slice(0, MAX));
  const freeText = $derived(query.trim());

  function pick(v: number | string) {
    onSelect(v);
    open = false;
  }
</script>

<Popover.Root bind:open onOpenChange={(o) => o && (query = "")}>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel && `${ariaLabel}: ${label || placeholder}`}
        class="w-full min-w-0 justify-between font-normal"
      >
        <span class={["truncate", !label && "text-muted-foreground"]}>{label || placeholder}</span>
        <ChevronsUpDown class="shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-72 p-0" align="start">
    <Command.Root shouldFilter={false}>
      <Command.Input bind:value={query} placeholder="Name oder Nr." />
      <Command.List>
        {#if results.length === 0 && !(allowFreeText && freeText)}
          <Command.Empty>Keine Treffer.</Command.Empty>
        {/if}
        {#each results as s (s.id)}
          <Command.Item value={String(s.id)} onSelect={() => pick(s.id)}>
            <Sprite id={s.id} size={28} />
            <span class="w-10 text-xs tabular-nums text-muted-foreground">#{String(s.id).padStart(3, "0")}</span>
            <span class="truncate">{s.name}</span>
          </Command.Item>
        {/each}
        {#if matches.length > MAX}
          <p class="px-2 py-1.5 text-xs text-muted-foreground">
            {matches.length - MAX} weitere Treffer – Suche eingrenzen
          </p>
        {/if}
        {#if allowFreeText && freeText}
          <Command.Item value="free-text" onSelect={() => pick(freeText)}>„{freeText}“ verwenden</Command.Item>
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
