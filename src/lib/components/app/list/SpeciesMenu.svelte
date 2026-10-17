<script lang="ts" module>
  /** Natives WebView-Menü (Nachschlagen, Teilen …) nur in Textfeldern, dort fürs Einfügen. */
  export const nativeMenu = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest("input, textarea, [contenteditable]") !== null;
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import CheckIcon from "@lucide/svelte/icons/check";
  import InfoIcon from "@lucide/svelte/icons/info";
  import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
  import { app, openWiki, showSpecies, toggleCaught } from "$lib/runs.svelte.ts";

  // Ein Menü für die ganze App statt eines je Eintrag; das Pokémon kommt aus data-species.
  let { children }: { children: Snippet } = $props();

  let id = $state<number>();
  const name = $derived(id === undefined ? "" : (app.data?.speciesById.get(id)?.name ?? ""));
  const caught = $derived(id !== undefined && (app.current?.caught ?? []).includes(id));

  function pick(e: MouseEvent) {
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-species]") : null;
    id = el ? Number(el.dataset.species) : undefined;
    if (el) return;
    // Ohne Pokémon kein eigenes Menü: Abbruch hält bits-ui ab, stopPropagation lässt das native durch.
    if (nativeMenu(e.target)) e.stopPropagation();
    else e.preventDefault();
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger class="contents" oncontextmenucapture={pick}>{@render children()}</ContextMenu.Trigger>
  <ContextMenu.Content>
    {#if id !== undefined}
      {@const sid = id}
      <ContextMenu.Label>{name}</ContextMenu.Label>
      <ContextMenu.Separator />
      <ContextMenu.Item onSelect={() => showSpecies(sid)}><InfoIcon />Details anzeigen</ContextMenu.Item>
      {#if app.current}
        <ContextMenu.Item onSelect={() => toggleCaught(sid)}>
          <CheckIcon />{caught ? "Nicht mehr gefangen" : "Als gefangen markieren"}
        </ContextMenu.Item>
      {/if}
      <ContextMenu.Item onSelect={() => void openWiki(name)}><ExternalLinkIcon />Im PokéWiki öffnen</ContextMenu.Item>
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>
