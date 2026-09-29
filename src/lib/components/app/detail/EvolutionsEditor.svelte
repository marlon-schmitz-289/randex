<script lang="ts">
  import XIcon from "@lucide/svelte/icons/x";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { updateEntry } from "$lib/runs.svelte.ts";
  import type { Evolution, PokemonEntry } from "$lib/types.ts";
  import SpeciesPicker from "../list/SpeciesPicker.svelte";

  let { speciesId, entry }: { speciesId: number; entry: PokemonEntry } = $props();

  const METHODS: { value: Evolution["method"]; label: string; placeholder: string }[] = [
    { value: "level", label: "Level", placeholder: "z. B. 16" },
    { value: "item", label: "Item", placeholder: "z. B. Feuerstein" },
    { value: "other", label: "Sonstiges", placeholder: "z. B. Tausch, Freundschaft" },
  ];

  const evolutions = $derived(entry.evolutions ?? []);

  function setAll(list: Evolution[]) {
    updateEntry(speciesId, { evolutions: list.length ? list : undefined });
  }

  function patch(i: number, p: Partial<Evolution>) {
    setAll(evolutions.map((e, j) => (j === i ? { ...e, ...p } : e)));
  }

  const isMethod = (v: string): v is Evolution["method"] => METHODS.some((m) => m.value === v);
</script>

<div class="flex flex-col gap-2">
  {#each evolutions as evo, i (i)}
    {@const method = METHODS.find((m) => m.value === evo.method) ?? METHODS[0]}
    <div class="grid grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto] items-center gap-2">
      <SpeciesPicker
        value={evo.target}
        allowFreeText
        exclude={[speciesId]}
        onSelect={(target) => patch(i, { target })}
      />
      <Select.Root
        type="single"
        value={evo.method}
        onValueChange={(v) => isMethod(v) && patch(i, { method: v })}
      >
        <Select.Trigger class="w-full" aria-label="Methode für Entwicklung {i + 1}">{method.label}</Select.Trigger>
        <Select.Content>
          {#each METHODS as m (m.value)}
            <Select.Item value={m.value} label={m.label} />
          {/each}
        </Select.Content>
      </Select.Root>
      <Input
        type={evo.method === "level" ? "number" : "text"}
        value={evo.value}
        placeholder={method.placeholder}
        aria-label="{method.label} für Entwicklung {i + 1}"
        oninput={(e) => patch(i, { value: e.currentTarget.value })}
      />
      <Button variant="ghost" size="icon" aria-label="Entwicklung {i + 1} entfernen" onclick={() => setAll(evolutions.filter((_, j) => j !== i))}>
        <XIcon />
      </Button>
    </div>
  {/each}
  <SpeciesPicker
    value={null}
    allowFreeText
    exclude={[speciesId]}
    placeholder="Entwicklung hinzufügen …"
    onSelect={(target) => setAll([...evolutions, { target, method: "level", value: "" }])}
  />
</div>
