<script lang="ts" module>
  import { normalize } from "$lib/search.ts";

  type Indexed = { name: string; key: string }[];
  // Pro Liste (per loadGameData gecacht) einmal, statt pro Picker-Instanz.
  const indexCache = new WeakMap<readonly { name: string }[], Indexed>();

  function indexFor(items: readonly { name: string }[]): Indexed {
    let index = indexCache.get(items);
    if (!index) {
      // Namen können doppelt vorkommen (z. B. Z-Attacken physisch/speziell)
      index = [...new Set(items.map((i) => i.name))].map((name) => ({ name, key: normalize(name) }));
      indexCache.set(items, index);
    }
    return index;
  }
</script>

<script lang="ts">
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";

  let {
    items,
    value,
    onSelect,
    placeholder = "Auswählen …",
  }: {
    items: { name: string }[];
    value: string;
    onSelect: (name: string) => void;
    placeholder?: string;
  } = $props();

  const LIMIT = 50;

  let open = $state(false);
  let query = $state("");

  const index = $derived(indexFor(items));
  const q = $derived(normalize(query));
  // ponytail: nur die ersten 50 Treffer, reicht zum Tippen-und-Wählen
  const results = $derived.by(() => {
    if (!q) return index.slice(0, LIMIT).map((i) => i.name);
    const prefix: string[] = [];
    const sub: string[] = [];
    for (const i of index) {
      if (i.key.startsWith(q)) prefix.push(i.name);
      else if (i.key.includes(q)) sub.push(i.name);
    }
    return [...prefix, ...sub].slice(0, LIMIT);
  });
  const freeText = $derived(query.trim());
  const exact = $derived(index.some((i) => i.key === q));

  function pick(name: string) {
    onSelect(name);
    open = false;
    query = "";
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="w-full min-w-0 justify-between font-normal"
      >
        <span class={["truncate", !value && "text-muted-foreground"]}>{value || placeholder}</span>
        <ChevronsUpDownIcon class="opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-72 p-0" align="start">
    <Command.Root shouldFilter={false}>
      <Command.Input bind:value={query} placeholder="Suchen oder frei eingeben …" />
      <Command.List>
        <Command.Empty>Keine Treffer.</Command.Empty>
        {#if freeText && !exact}
          <Command.Item value={"\u0000" + freeText} onSelect={() => pick(freeText)}>
            <PlusIcon />„{freeText}“ übernehmen
          </Command.Item>
        {/if}
        {#each results as name (name)}
          <Command.Item value={name} onSelect={() => pick(name)}>{name}</Command.Item>
        {/each}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
