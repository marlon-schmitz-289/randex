<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import { app, mutate, showSpecies } from "$lib/runs.svelte.ts";
  import { loadBadges, loadFieldMoves } from "$lib/data.ts";
  import { TEAM_SIZE, type Badge, type FieldMove, type TeamMember } from "$lib/types.ts";
  import { EmptyState, EditRow, Panel, Section, SelectCard } from "$lib/components/kit";
  import { Input } from "$lib/components/ui/input/index.js";
  import Sprite from "./list/Sprite.svelte";
  import SpeciesPicker from "./list/SpeciesPicker.svelte";

  const team = $derived(app.current?.team ?? []);
  const owned = $derived({
    badges: new Set(app.current?.badges ?? []),
    fieldMoves: new Set(app.current?.fieldMoves ?? []),
  });
  const progress = $derived(
    app.current
      ? Promise.all([loadBadges(app.current.gameId), loadFieldMoves(app.current.gameId).catch(() => [])])
      : Promise.resolve<[Badge[], FieldMove[]]>([[], []]),
  );

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

  function toggle(key: "badges" | "fieldMoves", id: string) {
    mutate((r) => {
      const set = new Set(r[key] ?? []);
      if (!set.delete(id)) set.add(id);
      r[key] = [...set];
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
  <Panel title="Team ({team.length}/{TEAM_SIZE})" flush bodyClass="overflow-y-auto">
    <ul class="space-y-2 p-3">
      {#each team as m, i}
        {@const name = app.data?.speciesById.get(m.speciesId)?.name ?? `#${m.speciesId}`}
        <EditRow inset removeLabel="{name} aus dem Team entfernen" onRemove={() => mutate((r) => r.team?.splice(i, 1))}>
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
        </EditRow>
      {/each}
      {#if team.length < TEAM_SIZE}
        <li>
          <SpeciesPicker placeholder="Pokémon zum Team hinzufügen" onSelect={addMember} />
        </li>
      {/if}
    </ul>
  </Panel>

  <!-- Wie links: Rahmen bleiben ganz sichtbar, nur der Inhalt scrollt -->
  <div class="flex min-h-0 flex-col gap-3">
    {#await progress then [badges, fieldMoves]}
      <Panel
        title="Orden ({badges.filter((b) => owned.badges.has(b.id)).length}/{badges.length})"
        bodyClass="space-y-4 overflow-y-auto"
      >
        {#each groups(badges) as [group, list] (group)}
          {#if group}
            <Section title={group}>{@render badgeGrid(list)}</Section>
          {:else}
            {@render badgeGrid(list)}
          {/if}
        {:else}
          <EmptyState variant="inline">Für dieses Spiel sind keine Orden hinterlegt.</EmptyState>
        {/each}
      </Panel>
      {#if fieldMoves.length}
        <Panel
          title="Feldfähigkeiten ({fieldMoves.filter((f) => owned.fieldMoves.has(f.id)).length}/{fieldMoves.length})"
          class="min-h-40 flex-1"
          bodyClass="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] content-start gap-2 overflow-y-auto"
        >
          {#each fieldMoves as f (f.id)}
            {@const badge = f.badge && badges.find((b) => b.id === f.badge)?.name}
            {@render card(
              owned.fieldMoves.has(f.id),
              undefined,
              f.name,
              f.place,
              () => toggle("fieldMoves", f.id),
              badge ? `${f.how} · ab ${badge}` : f.how,
            )}
          {/each}
        </Panel>
      {/if}
    {:catch e}
      <Panel title="Fortschritt" flush>
        <EmptyState>Fortschritt konnte nicht geladen werden: {e instanceof Error ? e.message : e}</EmptyState>
      </Panel>
    {/await}
  </div>
</div>

{#snippet badgeGrid(list: Badge[])}
  <div class="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
    {#each list as b (b.id)}
      {@render card(owned.badges.has(b.id), b.sprite, b.name, `${b.leader} · ${b.place}`, () => toggle("badges", b.id))}
    {/each}
  </div>
{/snippet}

{#snippet card(on: boolean, sprite: string | undefined, title: string, sub: string, onclick: () => void, detail?: string)}
  <SelectCard pressed={on} {onclick} class="flex items-center gap-3 p-2">
    {#if sprite}
      <img
        src={sprite}
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
      <span class="block truncate text-sm font-semibold {on ? 'text-foreground' : ''}">{title}</span>
      <span class="block truncate text-xs">{sub}</span>
      {#if detail}<span class="mt-0.5 block text-xs text-muted-foreground">{detail}</span>{/if}
    </span>
  </SelectCard>
{/snippet}
