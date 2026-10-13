<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import Hint from "./Hint.svelte";

  interface Props {
    id: string;
    label: string;
    checked: boolean;
    hint?: string;
    disabled?: boolean;
  }

  let { id, label, checked = $bindable(), hint, disabled = false }: Props = $props();
</script>

<div class="grid gap-1.5">
  <div class="flex items-center gap-2">
    <Switch {id} bind:checked {disabled} />
    <Label for={id} class="font-normal">{label}</Label>
  </div>
  {#if hint}<Hint>{hint}</Hint>{/if}
</div>
