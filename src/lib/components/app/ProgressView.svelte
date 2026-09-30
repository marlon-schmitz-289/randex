<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import { app, mutate, showSpecies } from "$lib/runs.svelte.ts";
  import { loadBadges } from "$lib/data.ts";
  import { TEAM_SIZE, type Badge, type TeamMember } from "$lib/types.ts";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import Sprite from "./list/Sprite.svelte";
  import SpeciesPicker from "./list/SpeciesPicker.svelte";

  const team = $derived(app.current?.team ?? []);
  const owned = $derived(new Set(app.current?.badges ?? []));
  const badgesPromise = $derived(app.current ? loadBadges(app.current.gameId) : Promise.resolve([]));

  function editMember(i: number, patch: Partial<TeamMember>) {
    mutate((r) => {
      const m = r.team?.[i];
      if (m) Object.assign(m, patch);
    });
  }

  function addMember(v: number | string) {
    if (typeof v !== "number") return;
    mutate((r) => {
      r.team ??= [];
      r.team.push({ speciesId: v });
    });
  }

  function toggleBadge(id: string) {
    mutate((r) => {
      const set = new Set(r.badges ?? []);
      if (!set.delete(id)) set.add(id);
      r.badges = [...set];
    });
  }

  function groups(badges: Badge[]): [string, Badge[]][] {
    const out = new Map<string, Badge[]>();
    for (const b of badges) {
      const key = b.group ?? "";
      out.set(key, [...(out.get(key) ?? []), b]);
    }
    return [...out];
  }

  function parseLevel(v: string): number | undefined {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : Math.min(100, Math.max(1, n));
  }
</script>

<div class="grid h-full min-h-0 grid-cols-[minmax(20rem,26rem)_1fr] gap-3">
  <section class="panel flex min-h-0 flex-col">
    <h2 class="panel-header px-4 py-2 text-sm">Team ({team.length}/{TEAM_SIZE})</h2>
    <ul class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      {#each team as m, i}
        {@const name = app.data?.speciesById.get(m.speciesId)?.name ?? `#${m.speciesId}`}
        <li class="flex items-center gap-2 rounded-md border border-panel-border bg-panel-inset p-2">
          <button type="button" class="shrink-0 rounded-md" title="{name} ansehen" onclick={() => showSpecies(m.speciesId)}>
            <Sprite id={m.speciesId} size={48} />
          </button>
          <div class="grid min-w-0 flex-1 gap-1">
            <span class="truncate text-sm font-semibold">{name}</span>
            <div class="flex gap-2">
              <Input
                class="h-7 min-w-0 flex-1 text-xs"
                placeholder="Spitzname"
                aria-label="Spitzname von {name}"
                value={m.nickname ?? ""}
                oninput={(e) => editMember(i, { nickname: e.currentTarget.value || undefined })}
              />
              <Input
                class="h-7 w-16 text-xs"
                type="number"
                min="1"
                max="100"
                placeholder="Lv."
                aria-label="Level von {name}"
                value={m.level ?? ""}
                onchange={(e) => {
                  const level = parseLevel(e.currentTarget.value);
                  e.currentTarget.value = level?.toString() ?? "";
                  editMember(i, { level });
                }}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="{name} aus dem Team entfernen"
            onclick={() => mutate((r) => r.team?.splice(i, 1))}
          >
            <X />
          </Button>
        </li>
      {/each}
      {#if team.length < TEAM_SIZE}
        <li>
          <SpeciesPicker placeholder="Pokémon zum Team hinzufügen" onSelect={addMember} />
        </li>
      {/if}
    </ul>
  </section>

  <section class="panel flex min-h-0 flex-col">
    {#await badgesPromise then badges}
      <h2 class="panel-header px-4 py-2 text-sm">
        Orden ({badges.filter((b) => owned.has(b.id)).length}/{badges.length})
      </h2>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {#each groups(badges) as [group, list] (group)}
          <div>
            {#if group}<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</h3>{/if}
            <div class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
              {#each list as b (b.id)}
                {@const on = owned.has(b.id)}
                <button
                  type="button"
                  aria-pressed={on}
                  class="group flex items-center gap-3 rounded-md border-2 p-2 text-left transition-colors {on
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-panel-border bg-panel-inset text-muted-foreground hover:border-ring'}"
                  onclick={() => toggleBadge(b.id)}
                >
                  {#if b.sprite}
                    <img
                      src={b.sprite}
                      alt=""
                      width="48"
                      height="48"
                      loading="lazy"
                      class="size-12 shrink-0 object-contain transition-[filter,opacity] {on
                        ? 'drop-shadow-md'
                        : 'opacity-50 grayscale group-hover:opacity-80'}"
                    />
                  {:else}
                    <span class="grid size-12 shrink-0 place-items-center rounded-full border-2 border-current">
                      {#if on}<Check class="size-5" />{/if}
                    </span>
                  {/if}
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold {on ? 'text-foreground' : ''}">{b.name}</span>
                    <span class="block truncate text-xs">{b.leader} · {b.place}</span>
                  </span>
                  {#if on}<Check class="ml-auto size-4 shrink-0 text-primary" />{/if}
                </button>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">Für dieses Spiel sind keine Orden hinterlegt.</p>
        {/each}
      </div>
    {:catch e}
      <h2 class="panel-header px-4 py-2 text-sm">Orden</h2>
      <p class="p-4 text-sm text-muted-foreground">Orden konnten nicht geladen werden: {e instanceof Error ? e.message : e}</p>
    {/await}
  </section>
</div>
