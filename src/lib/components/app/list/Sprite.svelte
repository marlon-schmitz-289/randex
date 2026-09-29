<script lang="ts">
  import { spriteUrl } from "$lib/data.ts";
  import { cn } from "$lib/utils.js";

  let { id, size = 40, class: className }: { id: number; size?: number; class?: string } = $props();
  // An die ID gekoppelt: wechselt die ID, gilt das neue Bild wieder als ladbar.
  let failedId = $state<number | null>(null);
  const failed = $derived(failedId === id);
</script>

{#if failed}
  <span
    class={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground", className)}
    style="width:{size}px;height:{size}px"
    aria-hidden="true">?</span
  >
{:else}
  <img
    src={spriteUrl(id)}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    class={cn("shrink-0 [image-rendering:pixelated]", className)}
    style="width:{size}px;height:{size}px"
    onerror={() => (failedId = id)}
  />
{/if}
