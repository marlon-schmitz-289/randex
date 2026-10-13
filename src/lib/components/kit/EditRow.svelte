<script lang="ts">
  import type { Snippet } from "svelte";
  import XIcon from "@lucide/svelte/icons/x";
  import { cn } from "$lib/utils";
  import IconButton from "./IconButton.svelte";

  type Props = {
    children: Snippet;
    inset?: boolean;
    class?: string;
  } & (
    | { onRemove: () => void; removeLabel: string }
    | { onRemove?: undefined; removeLabel?: undefined }
  );

  let { children, onRemove, removeLabel, inset = false, class: className }: Props = $props();
</script>

<li
  class={cn(
    "flex items-center gap-2",
    inset && "rounded-md border border-panel-border bg-panel-inset p-2",
  )}
>
  <div class={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
    {@render children()}
  </div>
  {#if onRemove}
    <IconButton label={removeLabel ?? ""} onclick={onRemove}><XIcon /></IconButton>
  {:else}
    <span class="size-8 shrink-0" aria-hidden="true"></span>
  {/if}
</li>
