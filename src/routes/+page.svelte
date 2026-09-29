<script lang="ts">
  import { onMount } from "svelte";
  import AppShell from "$lib/components/app/AppShell.svelte";
  import { initRuns } from "$lib/runs.svelte.ts";

  onMount(() => void initRuns());
</script>

<AppShell />
