<script lang="ts">
  import type { Snippet } from "svelte";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import { cn } from "$lib/utils";

  interface Props {
    title: string;
    aside?: Snippet;
    children: Snippet;
    /** Als Karte, deren Kopfzeile den Inhalt ein- und ausklappt (anfangs offen) */
    collapsible?: boolean;
    class?: string;
  }

  let { title, aside, children, collapsible = false, class: className }: Props = $props();

  const id = $props.id();
  let open = $state(true);
</script>

{#snippet asideText()}
  {#if aside}<span class="ml-1 font-normal tabular-nums">{@render aside()}</span>{/if}
{/snippet}

{#if collapsible}
  <!-- Als Karte: Kopfzeile klappt, Inhalt eingerückt wie ein Panel-Body -->
  <Collapsible.Root bind:open>
    <section
      aria-labelledby={id}
      class={cn("overflow-hidden rounded-md border border-panel-border bg-panel-inset", className)}
    >
      <h3 {id} class="text-sm font-semibold">
        <Collapsible.Trigger
          class="group flex w-full items-center gap-1.5 px-3 py-2 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=open]:border-b data-[state=open]:border-panel-border"
        >
          <ChevronRightIcon
            class="size-4 text-primary transition-transform group-data-[state=open]:rotate-90"
            aria-hidden="true"
          />
          {title}{@render asideText()}
        </Collapsible.Trigger>
      </h3>
      <Collapsible.Content class="flex flex-col gap-2 p-3">
        {@render children()}
      </Collapsible.Content>
    </section>
  </Collapsible.Root>
{:else}
  <section aria-labelledby={id} class={cn("flex flex-col gap-2", className)}>
    <h3 {id} class="text-sm font-semibold text-muted-foreground">{title}{@render asideText()}</h3>
    {@render children()}
  </section>
{/if}
