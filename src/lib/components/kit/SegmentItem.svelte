<script lang="ts">
  import type { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import { cn } from "$lib/utils";

  let { class: className, ...rest }: ToggleGroupPrimitive.ItemProps = $props();
</script>

<ToggleGroup.Item
  class={cn("data-[state=on]:bg-primary data-[state=on]:text-primary-foreground", className)}
  {...rest}
/>
