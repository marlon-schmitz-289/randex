<script lang="ts">
  import { app } from "$lib/runs.svelte.ts";
  import { cn } from "$lib/utils.js";
  import type { TypeId } from "$lib/types.ts";

  let { id, size = "md", class: className }: { id: TypeId; size?: "sm" | "md"; class?: string } = $props();
  const label = $derived(app.data?.typesById.get(id)?.name ?? id);
</script>

<span
  class={cn(
    "inline-flex items-center justify-center rounded-md font-semibold leading-none",
    size === "sm" ? "px-1.5 py-1 text-[0.65rem]" : "px-2.5 py-1 text-xs",
    className,
  )}
  style="background-color: var(--type-{id}); color: var(--color-type-{id}-foreground)">{label}</span
>
