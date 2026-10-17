<script lang="ts">
  import type { Snippet } from "svelte";
  import XIcon from "@lucide/svelte/icons/x";
  import { cn } from "$lib/utils";
  import { roving } from "./roving";
  import IconButton from "./IconButton.svelte";

  type Props = {
    children: Snippet;
    onclick?: () => void;
    class?: string;
  } & (
    | { onRemove: () => void; removeLabel: string }
    | { onRemove?: undefined; removeLabel?: undefined }
  );

  let { children, onclick, onRemove, removeLabel, class: className }: Props = $props();

  const inner = $derived(
    cn(
      "flex items-center gap-1 rounded-full py-0.5 pl-2.5 has-[img]:pl-1",
      onRemove ? "pr-1" : "pr-2.5",
      onclick && "hover:bg-accent hover:text-accent-foreground",
    ),
  );
</script>

<span
  class={cn(
    "inline-flex items-center rounded-full border border-panel-border bg-secondary text-sm text-secondary-foreground",
    className,
  )}
>
  {#if onclick}
    <button {@attach roving} type="button" class={inner} {onclick}>{@render children()}</button>
  {:else}
    <span class={inner}>{@render children()}</span>
  {/if}
  {#if onRemove}
    <IconButton
      {@attach roving}
      size="icon-xs"
      class="rounded-full hover:bg-destructive hover:text-destructive-foreground"
      label={removeLabel ?? ""}
      onclick={onRemove}
    >
      <XIcon />
    </IconButton>
  {/if}
</span>
