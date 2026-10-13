<script lang="ts">
  import { cn } from "$lib/utils";

  /** 32×32-Item-Icon; ohne `src` ein leerer Platzhalter, damit Zeilen bündig bleiben. */
  let { src, class: className }: { src?: string; class?: string } = $props();
</script>

{#if src}
  <img {src} alt="" width="32" height="32" loading="lazy" class={cn("size-8 shrink-0", className)} />
{:else}
  <span class={cn("size-8 shrink-0", className)} aria-hidden="true"></span>
{/if}
