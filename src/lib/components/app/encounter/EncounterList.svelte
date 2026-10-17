<script lang="ts">
  import type { Component } from "svelte";
  import BugIcon from "@lucide/svelte/icons/bug";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CloudSunIcon from "@lucide/svelte/icons/cloud-sun";
  import Flower2Icon from "@lucide/svelte/icons/flower-2";
  import Gamepad2Icon from "@lucide/svelte/icons/gamepad-2";
  import LeafIcon from "@lucide/svelte/icons/leaf";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import RadarIcon from "@lucide/svelte/icons/radar";
  import RadioIcon from "@lucide/svelte/icons/radio";
  import SnowflakeIcon from "@lucide/svelte/icons/snowflake";
  import SunIcon from "@lucide/svelte/icons/sun";
  import SunriseIcon from "@lucide/svelte/icons/sunrise";
  import TreeDeciduousIcon from "@lucide/svelte/icons/tree-deciduous";
  import UsersIcon from "@lucide/svelte/icons/users";
  import { app, showSpecies } from "$lib/runs.svelte.ts";
  import type { EncounterMethod, OriginalEncounter } from "$lib/types.ts";
  import Sprite from "$lib/components/app/list/Sprite.svelte";
  import { NavRow } from "$lib/components/kit";

  let { method, rows }: { method: EncounterMethod; rows: OriginalEncounter[] } = $props();

  type Variant = { icon: Component; label: string };
  // Häufigkeit als Liste: je Tageszeit oder je Jahreszeit (die Länge bestimmt, welche)
  const VARIANTS: Record<number, Variant[]> = {
    3: [
      { icon: SunriseIcon, label: "morgens" },
      { icon: SunIcon, label: "tagsüber" },
      { icon: MoonIcon, label: "nachts" },
    ],
    4: [
      { icon: Flower2Icon, label: "Frühling" },
      { icon: SunIcon, label: "Sommer" },
      { icon: LeafIcon, label: "Herbst" },
      { icon: SnowflakeIcon, label: "Winter" },
    ],
  };

  const CONDITIONS: Record<string, string> = {
    "swarm-yes": "Schwarm",
    "radar-on": "Poké-Radar",
    "slot2-ruby": "Rubin",
    "slot2-sapphire": "Saphir",
    "slot2-emerald": "Smaragd",
    "slot2-firered": "Feuerrot",
    "slot2-leafgreen": "Blattgrün",
    "radio-hoenn": "Hoenn-Sound",
    "radio-sinnoh": "Sinnoh-Sound",
    "bug-catching-contest-yes": "Käferturnier",
    "headbutt-tree-common": "Häufige Bäume",
    "headbutt-tree-rare": "Seltene Bäume",
    "headbutt-tree-secret": "Besondere Bäume",
    "weekday-monday": "Montags",
    "weekday-tuesday": "Dienstags",
    "weekday-wednesday": "Mittwochs",
    "weekday-thursday": "Donnerstags",
    "weekday-friday": "Freitags",
    "weekday-saturday": "Samstags",
    "weekday-sunday": "Sonntags",
    "weather-normal": "Klar",
    "weather-overcast": "Bewölkt",
    "weather-raining": "Regen",
    "weather-thunderstorm": "Gewitter",
    "weather-intense-sun": "Sonne",
    "weather-snowing": "Schnee",
    "weather-snowstorm": "Schneesturm",
    "weather-sandstorm": "Sandsturm",
    "weather-fog": "Nebel",
  };
  // Icon je Art der Bedingung (Präfix des Schlüssels)
  const CONDITION_ICONS: Record<string, Component> = {
    swarm: UsersIcon,
    radar: RadarIcon,
    slot2: Gamepad2Icon,
    radio: RadioIcon,
    bug: BugIcon,
    headbutt: TreeDeciduousIcon,
    weekday: CalendarDaysIcon,
    weather: CloudSunIcon,
  };

  // Geschenke und Einzelbegegnungen haben keine sinnvolle Häufigkeit
  const showChance = $derived(method !== "gift" && method !== "static");

  /**
   * Zeilen je Bereich (die Daten sind danach sortiert, ohne Bedingung zuerst). Bereiche mit gleichen Begegnungen
   * werden zusammengefasst; gilt das für alle, entfällt die Überschrift.
   */
  const areas = $derived.by(() => {
    const byArea: { area: string; rows: OriginalEncounter[] }[] = [];
    for (const r of rows) {
      const area = r[5] ?? "";
      if (byArea.at(-1)?.area === area) byArea.at(-1)?.rows.push(r);
      else byArea.push({ area, rows: [r] });
    }
    const merged = new Map<string, { areas: string[]; rows: OriginalEncounter[] }>();
    for (const { area, rows } of byArea) {
      const key = JSON.stringify(rows.map((r) => r.slice(0, 5)));
      const m = merged.get(key);
      if (m) m.areas.push(area);
      else merged.set(key, { areas: [area], rows });
    }
    const out = [...merged.values()];
    return out.map((m) => ({ area: out.length > 1 ? m.areas.join(" · ") : "", rows: m.rows }));
  });

  /** GBA-Slot mit mehreren Editionen als Kürzel (voller Text im Tooltip) */
  const EDITION_SHORT: Record<string, string> = {
    "slot2-ruby": "RU",
    "slot2-sapphire": "SA",
    "slot2-emerald": "SM",
    "slot2-firered": "FR",
    "slot2-leafgreen": "BG",
  };

  function conditionText(condition: string): { text: string; full: string } {
    const keys = condition.split(" ");
    const full = keys.map((k) => CONDITIONS[k] ?? k).join(", ");
    if (!keys[0].startsWith("slot2-")) return { text: full, full };
    const text = keys.length > 1 ? keys.map((k) => EDITION_SHORT[k] ?? k).join(", ") : full;
    return { text: `GBA: ${text}`, full: `${full} im GBA-Slot` };
  }

  /** Gleiche Werte zusammengefasst, 0 (dann nicht da) weggelassen: [5, 5, 15] → morgens+tagsüber 5 %, nachts 15 % */
  function variantChances(list: number[]): { variants: Variant[]; value: number }[] {
    const names = VARIANTS[list.length] ?? [];
    const out: { variants: Variant[]; value: number }[] = [];
    list.forEach((value, i) => {
      if (!value || !names[i]) return;
      const same = out.find((o) => o.value === value);
      if (same) same.variants.push(names[i]);
      else out.push({ variants: [names[i]], value });
    });
    return out;
  }

  const level = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);
</script>

{#each areas as a, i (i)}
  <div class={["relative flex flex-col gap-1", i > 0 && "border-t border-panel-border pt-2"]}>
    {#if a.area}<h4 class="text-xs font-semibold">{a.area}</h4>{/if}
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-1">
      {#each a.rows as [id, min, max, chance, condition], j (j)}
        <li data-species={id}>
          <NavRow onclick={() => showSpecies(id)}>
            <Sprite {id} size={32} />
            <span class="flex min-w-0 flex-col leading-tight">
              <span class="truncate">{app.data?.speciesById.get(id)?.name ?? `#${id}`}</span>
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                <span class="tabular-nums">Lv. {level(min, max)}</span>
                {#if condition}
                  {@const Icon = CONDITION_ICONS[condition.split("-")[0]]}
                  {@const { text, full } = conditionText(condition)}
                  <span class="flex min-w-0 items-center gap-1" title={full}>
                    · {#if Icon}<Icon class="size-3 shrink-0" aria-hidden="true" />{/if}
                    <span class="truncate" aria-hidden="true">{text}</span><span class="sr-only">{full}</span>
                  </span>
                {/if}
              </span>
            </span>
            {#snippet meta()}
              {#if showChance && typeof chance === "number"}
                <span class="font-semibold">{chance} %</span>
              {:else if showChance && Array.isArray(chance)}
                <span class="flex flex-col items-end gap-0.5">
                  {#each variantChances(chance) as { variants, value } (variants[0].label)}
                    <span class="flex items-center gap-0.5 font-semibold">
                      {#each variants as v (v.label)}
                        <v.icon class="size-3 text-primary" aria-hidden="true" />
                      {/each}
                      <span class="sr-only">{variants.map((v) => v.label).join(", ")}</span>
                      {value} %
                    </span>
                  {/each}
                </span>
              {/if}
            {/snippet}
          </NavRow>
        </li>
      {/each}
    </ul>
  </div>
{/each}
