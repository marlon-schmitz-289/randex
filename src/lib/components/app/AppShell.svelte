<script lang="ts">
  import { mode, toggleMode } from "mode-watcher";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { check, type Update } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Download from "@lucide/svelte/icons/download";
  import MapIcon from "@lucide/svelte/icons/map";
  import Trophy from "@lucide/svelte/icons/trophy";
  import Moon from "@lucide/svelte/icons/moon";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import Sun from "@lucide/svelte/icons/sun";
  import Trash from "@lucide/svelte/icons/trash-2";
  import Upload from "@lucide/svelte/icons/upload";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import BookCheck from "@lucide/svelte/icons/book-check";
  import Gamepad from "@lucide/svelte/icons/gamepad-2";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { EmptyState, IconButton, Panel, TabTrigger } from "$lib/components/kit";
  import {
    app,
    deleteRun,
    exportCurrentRun,
    importRunFromFile,
    openRun,
  } from "$lib/runs.svelte.ts";
  import type { View } from "$lib/types.ts";
  import RunDialog from "./RunDialog.svelte";
  import PokemonList from "./list/PokemonList.svelte";
  import PokemonDetail from "./PokemonDetail.svelte";
  import EncounterView from "./encounter/EncounterView.svelte";
  import PokedexView from "./PokedexView.svelte";
  import ProgressView from "./ProgressView.svelte";
  import SaveView from "./SaveView.svelte";
  import SpeciesMenu from "./list/SpeciesMenu.svelte";

  let createOpen = $state(false);
  let editOpen = $state(false);
  let deleteOpen = $state(false);

  const gameName = (id: string) => app.games.find((g) => g.id === id)?.name ?? id;
  // Neue Version aus GitHub-Releases; Fehler (offline, Dev-Build) still ignorieren.
  let update = $state<Update | null>(null);
  let updating = $state(false);
  onMount(() => {
    check().then((u) => (update = u), () => {});
  });

  async function installUpdate(u: Update) {
    updating = true;
    try {
      await u.downloadAndInstall();
      await relaunch();
    } catch (e) {
      toast.error(`Update fehlgeschlagen: ${String(e)}`);
      updating = false;
    }
  }

  const isView = (v: string): v is View => v === "pokemon" || v === "pokedex" || v === "routes" || v === "progress" || v === "save";
</script>

<div class="flex h-dvh flex-col">
  <header class="flex flex-wrap items-center gap-2 border-b-2 border-panel-border bg-panel px-3 py-2">
    <h1 class="mr-2 text-lg font-bold tracking-tight">Randex</h1>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button variant="outline" class="max-w-72" {...props}>
            <span class="truncate">{app.current?.name ?? "Run wählen"}</span>
            <ChevronDown />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="min-w-64">
        {#if app.runs.length}
          <DropdownMenu.Group>
            <DropdownMenu.Label>Runs</DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={app.current?.id ?? ""}
              onValueChange={(id) => void openRun(id)}
            >
              {#each app.runs as r (r.id)}
                <DropdownMenu.RadioItem value={r.id}>
                  <span class="flex min-w-0 flex-col">
                    <span class="truncate">{r.name}</span>
                    <span class="text-xs text-muted-foreground">{gameName(r.gameId)}</span>
                  </span>
                </DropdownMenu.RadioItem>
              {/each}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
        {/if}
        <DropdownMenu.Item onSelect={() => (createOpen = true)}><Plus /> Neuer Run</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => void importRunFromFile()}><Upload /> Importieren …</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    {#if app.current}
      <span class="hidden text-sm text-muted-foreground sm:inline">{gameName(app.current.gameId)}</span>

      <Tabs.Root value={app.view} onValueChange={(v) => isView(v) && (app.view = v)} class="mx-auto">
        <Tabs.List aria-label="Ansicht">
          <TabTrigger value="pokemon"><BookOpen /> Pokémon</TabTrigger>
          <TabTrigger value="pokedex"><BookCheck /> Pokédex</TabTrigger>
          <TabTrigger value="routes"><MapIcon /> Routen</TabTrigger>
          <TabTrigger value="progress"><Trophy /> Fortschritt</TabTrigger>
          {#if app.current.saveGame}
            <TabTrigger value="save"><Gamepad /> Spielstand</TabTrigger>
          {/if}
        </Tabs.List>
      </Tabs.Root>

      <IconButton label="Run bearbeiten" onclick={() => (editOpen = true)}>
        <Pencil />
      </IconButton>
      <IconButton label="Run exportieren" onclick={() => void exportCurrentRun()}>
        <Download />
      </IconButton>
      <IconButton label="Run löschen" onclick={() => (deleteOpen = true)}>
        <Trash />
      </IconButton>
    {:else}
      <span class="mx-auto"></span>
    {/if}

    {#if update}
      {@const u = update}
      <Button
        variant="ghost"
        class="text-primary"
        disabled={updating}
        title="Update installieren und neu starten"
        onclick={() => void installUpdate(u)}
      >
        <RefreshCw class={updating ? "animate-spin" : ""} />
        {updating ? "Aktualisiere …" : `Update ${u.version}`}
      </Button>
    {/if}

    <IconButton
      label={mode.current === "dark" ? "Heller Modus" : "Dunkler Modus"}
      title={mode.current === "dark" ? "Weiße Edition (hell)" : "Schwarze Edition (dunkel)"}
      onclick={toggleMode}
    >
      {#if mode.current === "dark"}<Sun />{:else}<Moon />{/if}
    </IconButton>
  </header>

  <SpeciesMenu>
    <main class="min-h-0 flex-1 p-3">
      {#if app.current && app.data}
        {#if app.view === "pokemon"}
          <div class="grid h-full grid-cols-[minmax(16rem,22rem)_1fr] gap-3">
            <PokemonList />
            <PokemonDetail />
          </div>
        {:else if app.view === "pokedex"}
          <PokedexView />
        {:else if app.view === "routes"}
          <EncounterView />
        {:else if app.view === "save"}
          <SaveView />
        {:else}
          <ProgressView />
        {/if}
      {:else if app.loading}
        <EmptyState variant="center" status>Lade …</EmptyState>
      {:else}
        <div class="grid h-full place-items-center">
          <Panel
            title={app.runs.length ? "Kein Run geöffnet" : "Noch kein Run"}
            class="w-full max-w-md overflow-hidden"
            bodyClass="grid gap-4"
          >
            <EmptyState variant="inline">
              {app.runs.length
                ? "Wähle oben einen Run oder lege einen neuen an."
                : "Lege einen Run für dein randomisiertes Spiel an oder importiere einen gespeicherten."}
            </EmptyState>
            <div class="flex gap-2">
              <Button onclick={() => (createOpen = true)}><Plus /> Neuer Run</Button>
              <Button variant="outline" onclick={() => void importRunFromFile()}><Upload /> Importieren</Button>
            </div>
          </Panel>
        </div>
      {/if}
    </main>
  </SpeciesMenu>
</div>

<RunDialog bind:open={createOpen} />
{#if app.current}
  <RunDialog bind:open={editOpen} run={app.current} />

  <AlertDialog.Root bind:open={deleteOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Run „{app.current.name}“ löschen?</AlertDialog.Title>
        <AlertDialog.Description>
          Alle Einträge und Encounter dieses Runs gehen verloren. Das lässt sich nicht rückgängig machen.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
        <AlertDialog.Action
          variant="destructive"
          onclick={() => {
            if (app.current) void deleteRun(app.current.id);
            deleteOpen = false;
          }}
        >
          Löschen
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
