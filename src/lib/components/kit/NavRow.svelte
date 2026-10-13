<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    onclick: () => void;
    children: Snippet;
    meta?: Snippet;
    current?: boolean;
    class?: string;
  }

  let { onclick, children, meta, current = false, class: className }: Props = $props();
</script>

<button
  type="button"
  aria-current={current || undefined}
  {onclick}
  class={cn(
    "flex w-full items-center gap-2 rounded-md border-l-4 border-transparent px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground aria-[current=true]:border-panel-header aria-[current=true]:bg-panel-header aria-[current=true]:text-panel-header-foreground",
    className,
  )}
>
  {@render children()}
  {#if meta}
    <span class="ml-auto shrink-0 text-xs tabular-nums opacity-80">{@render meta()}</span>
  {/if}
</button>
