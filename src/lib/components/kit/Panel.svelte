<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    title?: string;
    header?: Snippet;
    actions?: Snippet;
    children: Snippet;
    footer?: Snippet;
    flush?: boolean;
    class?: string;
    bodyClass?: string;
  }

  let {
    title,
    header,
    actions,
    children,
    footer,
    flush = false,
    class: className,
    bodyClass,
  }: Props = $props();

  const id = $props.id();
</script>

<section
  class={cn("panel flex min-h-0 flex-col", className)}
  aria-labelledby={title && !header ? id : undefined}
>
  {#if title || header}
    <div
      class={cn(
        "panel-header flex shrink-0 items-center gap-2 text-sm",
        header ? "px-2" : "px-4",
        header || actions ? "min-h-11 py-1.5" : "py-2",
      )}
    >
      {#if header}
        {@render header()}
      {:else}
        <h2 {id} class="truncate text-sm font-semibold">{title}</h2>
      {/if}
      {#if actions}
        <div class="ml-auto flex shrink-0 items-center gap-1 tabular-nums">
          {@render actions()}
        </div>
      {/if}
    </div>
  {/if}
  <div class={cn("min-h-0 flex-1", !flush && "p-3", bodyClass)}>
    {@render children()}
  </div>
  {#if footer}
    <div class="flex shrink-0 flex-wrap items-center gap-2 border-t border-panel-border p-3">
      {@render footer()}
    </div>
  {/if}
</section>
