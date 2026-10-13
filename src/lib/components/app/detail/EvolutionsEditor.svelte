<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { EditRow } from "$lib/components/kit";
  import { updateEntry } from "$lib/runs.svelte.ts";
  import type { Evolution, PokemonEntry } from "$lib/types.ts";
  import SpeciesPicker from "../list/SpeciesPicker.svelte";

  let { speciesId, entry }: { speciesId: number; entry: PokemonEntry } = $props();

  const METHODS: Record<Evolution["method"], { label: string; placeholder: string }> = {
    level: { label: "Level", placeholder: "z. B. 16" },
    item: { label: "Item", placeholder: "z. B. Feuerstein" },
    other: { label: "Sonstiges", placeholder: "z. B. Tausch, Freundschaft" },
  };

  const evolutions = $derived(entry.evolutions ?? []);

  function setAll(list: Evolution[]) {
    updateEntry(speciesId, { evolutions: list.length ? list : undefined });
  }

  function patch(i: number, p: Partial<Evolution>) {
    setAll(evolutions.map((e, j) => (j === i ? { ...e, ...p } : e)));
  }

  const isMethod = (v: string): v is Evolution["method"] => Object.hasOwn(METHODS, v);
</script>

<ul class="flex flex-col gap-2">
  {#each evolutions as evo, i (i)}
    {@const method = METHODS[evo.method]}
    <EditRow
      class="grid grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)]"
      removeLabel="Entwicklung {i + 1} entfernen"
      onRemove={() => setAll(evolutions.filter((_, j) => j !== i))}
    >
      <SpeciesPicker
        value={evo.target}
        label="Entwicklung {i + 1} Ziel"
        allowFreeText
        exclude={[speciesId]}
        onSelect={(target) => patch(i, { target })}
      />
      <Select.Root
        type="single"
        value={evo.method}
        onValueChange={(v) => isMethod(v) && patch(i, { method: v, value: "" })}
      >
        <Select.Trigger class="w-full" aria-label="Methode für Entwicklung {i + 1}">{method.label}</Select.Trigger>
        <Select.Content>
          {#each Object.entries(METHODS) as [value, m] (value)}
            <Select.Item {value} label={m.label} />
          {/each}
        </Select.Content>
      </Select.Root>
      <Input
        type={evo.method === "level" ? "number" : "text"}
        min={1}
        max={100}
        value={evo.value}
        placeholder={method.placeholder}
        aria-label="{method.label} für Entwicklung {i + 1}"
        oninput={(e) => patch(i, { value: e.currentTarget.value })}
      />
    </EditRow>
  {/each}
  <EditRow>
    <SpeciesPicker
      value={null}
      allowFreeText
      exclude={[speciesId]}
      placeholder="Entwicklung hinzufügen …"
      onSelect={(target) => setAll([...evolutions, { target, method: "level", value: "" }])}
    />
  </EditRow>
</ul>
