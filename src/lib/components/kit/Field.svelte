<script lang="ts">
  import type { Snippet } from "svelte";
  import { Label } from "$lib/components/ui/label";
  import Hint from "./Hint.svelte";

  interface Props {
    label: string;
    for: string;
    optional?: boolean;
    hint?: string;
    children: Snippet;
  }

  let { label, for: htmlFor, optional = false, hint, children }: Props = $props();
</script>

<div class="grid gap-1.5">
  <Label for={htmlFor}>
    {label}{#if optional}
      <span class="font-normal text-muted-foreground">(optional)</span>{/if}
  </Label>
  {@render children()}
  {#if hint}<Hint>{hint}</Hint>{/if}
</div>
