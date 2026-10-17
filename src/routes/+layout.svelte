<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { nativeMenu } from "$lib/components/app/list/SpeciesMenu.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  let { children } = $props();

  // Für alles außerhalb des App-Menüs, z. B. Dialoge im Portal.
  function onContextMenu(e: MouseEvent) {
    if (!nativeMenu(e.target)) e.preventDefault();
  }
</script>

<svelte:window oncontextmenu={onContextMenu} />
<ModeWatcher />
<Toaster />
{@render children()}
