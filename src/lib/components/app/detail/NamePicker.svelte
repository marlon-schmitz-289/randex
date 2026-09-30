<script lang="ts" module>
  import { normalize } from "$lib/search.ts";

  type Indexed = { name: string; key: string }[];
  // Index pro Liste einmal (Listen sind pro Spiel gecacht).
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
    label,
  }: {
    items: { name: string }[];
    value: string;
    onSelect: (name: string) => void;
    placeholder?: string;
    label?: string;
  } = $props();

  const LIMIT = 50;

  let open = $state(false);
  let query = $state("");

  const index = $derived(indexFor(items));
  const q = $derived(normalize(query));
  const matches = $derived.by(() => {
    if (!q) return index.map((i) => i.name);
    const prefix: string[] = [];
    const sub: string[] = [];
    for (const i of index) {
      if (i.key.startsWith(q)) prefix.push(i.name);
      else if (i.key.includes(q)) sub.push(i.name);
    }
    return [...prefix, ...sub];
  });
  // ponytail: nur 50 Treffer, danach Suche eingrenzen (siehe Hinweiszeile).
  const results = $derived(matches.slice(0, LIMIT));
  const freeText = $derived(query.trim());
  const exact = $derived(index.some((i) => i.key === q));

  function pick(name: string) {
    onSelect(name);
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
        aria-label={label && `${label}: ${value || placeholder}`}
        class="w-full min-w-0 justify-between font-normal"
      >
        <span class={["truncate", !value && "text-muted-foreground"]}>{value || placeholder}</span>
        <ChevronsUpDownIcon class="shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-72 p-0" align="start">
    <Command.Root shouldFilter={false}>
      <Command.Input bind:value={query} placeholder="Suchen oder frei eingeben …" />
      <Command.List>
        <Command.Empty>Keine Treffer.</Command.Empty>
        {#if freeText && !exact}
          <Command.Item value="free-text" onSelect={() => pick(freeText)}>
            <PlusIcon />„{freeText}“ übernehmen
          </Command.Item>
        {/if}
        {#each results as name (name)}
          <Command.Item value={name} onSelect={() => pick(name)}>{name}</Command.Item>
        {/each}
        {#if matches.length > LIMIT}
          <p class="px-2 py-1.5 text-xs text-muted-foreground">
            {matches.length - LIMIT} weitere Treffer – Suche eingrenzen
          </p>
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
