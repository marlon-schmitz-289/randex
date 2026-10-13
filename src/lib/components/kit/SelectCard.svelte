<script lang="ts">
  import type { Snippet } from "svelte";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { cn } from "$lib/utils";

  interface Props {
    pressed: boolean;
    onclick: () => void;
    children: Snippet;
    label?: string;
    class?: string;
  }

  let { pressed, onclick, children, label, class: className }: Props = $props();
</script>

<button
  type="button"
  aria-pressed={pressed}
  aria-label={label}
  title={label}
  {onclick}
  class={cn(
    "group relative rounded-md border-2 text-left transition-colors",
    pressed
      ? "border-primary bg-accent text-accent-foreground"
      : "border-panel-border bg-panel-inset text-muted-foreground hover:border-ring",
    className,
  )}
>
  {@render children()}
  {#if pressed}
    <CheckIcon
      class="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary p-0.5 text-primary-foreground"
      aria-hidden="true"
    />
  {/if}
</button>
