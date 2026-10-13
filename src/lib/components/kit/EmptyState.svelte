<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    children: Snippet;
    variant?: "block" | "inline" | "center";
    status?: boolean;
    class?: string;
  }

  let { children, variant = "block", status = false, class: className }: Props = $props();
</script>

<p
  role={status ? "status" : undefined}
  class={cn(
    "text-sm text-muted-foreground",
    variant === "block" && "p-4",
    variant === "center" && "grid h-full place-items-center p-6 text-center",
    className,
  )}
>
  {@render children()}
</p>
