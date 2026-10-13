<script lang="ts">
  import { app, setDex } from "$lib/runs.svelte.ts";
  import * as Select from "$lib/components/ui/select/index.js";
</script>

<!-- Pokédex-Wahl, gespeichert im Run und geteilt von Pokémon-Liste und Pokédex -->
{#if app.data?.dexes.length}
  <Select.Root type="single" value={app.dex?.id ?? "national"} onValueChange={setDex}>
    <Select.Trigger size="sm" class="max-w-full min-w-36" aria-label="Pokédex">
      <span class="truncate">{app.dex?.name ?? "National"}</span>
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="national">National</Select.Item>
      {#each app.data.dexes as d (d.id)}
        <Select.Item value={d.id}>{d.name}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
{/if}
