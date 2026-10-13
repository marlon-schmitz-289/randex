<script lang="ts">
  import type { Snippet } from "svelte";
  import { Button, type ButtonProps, type ButtonVariant } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";

  interface Props extends Omit<ButtonProps, "children" | "class" | "variant" | "size" | "href"> {
    label: string;
    children: Snippet;
    variant?: ButtonVariant;
    size?: "icon" | "icon-sm" | "icon-xs";
    onHeader?: boolean;
    class?: string;
  }

  let {
    label,
    children,
    variant = "ghost",
    size = "icon",
    onHeader = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<Button
  {variant}
  {size}
  aria-label={label}
  title={label}
  class={cn(
    onHeader &&
      "hover:bg-panel-header-foreground/15 hover:text-panel-header-foreground dark:hover:bg-panel-header-foreground/15",
    className,
  )}
  {...rest}
>
  {@render children()}
</Button>
