<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    children: Snippet;
    live?: boolean;
    class?: string;
  }

  let { children, live = false, class: className }: Props = $props();
</script>

<p aria-live={live ? "polite" : undefined} class={cn("text-xs text-muted-foreground", className)}>
  {@render children()}
</p>
