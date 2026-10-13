<script lang="ts">
  import type { Tabs as TabsPrimitive } from "bits-ui";
  import * as Tabs from "$lib/components/ui/tabs";
  import { cn } from "$lib/utils";

  let { class: className, ...rest }: TabsPrimitive.TriggerProps = $props();
</script>

<Tabs.Trigger
  class={cn(
    "data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-primary dark:data-active:bg-primary dark:data-active:text-primary-foreground",
    className,
  )}
  {...rest}
/>
