<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    title: string;
    aside?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { title, aside, children, class: className }: Props = $props();

  const id = $props.id();
</script>

<section aria-labelledby={id} class={cn("flex flex-col gap-2", className)}>
  <h3 {id} class="text-sm font-semibold text-muted-foreground">
    {title}{#if aside}<span class="ml-1 font-normal tabular-nums">{@render aside()}</span>{/if}
  </h3>
  {@render children()}
</section>
