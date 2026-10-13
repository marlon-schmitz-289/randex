<script lang="ts">
  interface Props {
    value: number;
    max: number;
    /** Füllfarbe, z. B. `STATS[i].bar`. */
    class: string;
  }

  let { value, max, class: barClass }: Props = $props();
</script>

<div class="h-2.5 overflow-hidden rounded-full bg-stat-track" aria-hidden="true">
  <div class={["h-full rounded-full", barClass]} style:width="{Math.min(value / max, 1) * 100}%"></div>
</div>
