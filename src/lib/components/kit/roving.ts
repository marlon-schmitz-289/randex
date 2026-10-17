import type { Attachment } from "svelte/attachments";

// Roving Tabindex: Eine Liste ist ein einziger Tab-Stopp, innerhalb wechseln Pfeiltasten, Pos1 und Ende.
const LIST = "ul, ol, [role='list'], [role='group']";
const ITEM = "[data-roving]:not(:disabled)";

type Item = HTMLElement | SVGElement;
const KEYS = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];

const active = new WeakMap<Element, Item>();
const pending = new Set<Element>();

function items(list: Element): Item[] {
  return [...list.querySelectorAll<Item>(ITEM)].filter((el) => el.closest(LIST) === list);
}

function sync(list: Element) {
  const all = items(list);
  const last = active.get(list);
  const keep =
    (last && all.includes(last) ? last : undefined) ??
    all.find((el) => el.getAttribute("aria-current") === "true") ??
    all[0];
  for (const el of all) el.tabIndex = el === keep ? 0 : -1;
}

// Pro Liste einmal je Microtask, statt bei jedem der bis zu ~1000 Einträge neu zu zählen.
function schedule(list: Element) {
  if (pending.has(list)) return;
  pending.add(list);
  queueMicrotask(() => {
    pending.delete(list);
    if (list.isConnected) sync(list);
  });
}

function onFocusIn(e: FocusEvent) {
  const list = e.currentTarget as Element;
  const item = e.target instanceof Element ? e.target.closest<Item>(ITEM) : null;
  if (!item || item.closest(LIST) !== list) return;
  active.set(list, item);
  sync(list);
}

function onKeyDown(e: KeyboardEvent) {
  const list = e.currentTarget as Element;
  if (!KEYS.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!(e.target instanceof HTMLElement || e.target instanceof SVGElement) || !e.target.matches(ITEM) || e.target.closest(LIST) !== list) return;
  const all = items(list);
  const i = all.indexOf(e.target);
  const next =
    e.key === "Home" ? 0
    : e.key === "End" ? all.length - 1
    : e.key === "ArrowDown" || e.key === "ArrowRight" ? Math.min(i + 1, all.length - 1)
    : Math.max(i - 1, 0);
  e.preventDefault();
  const target = all[next];
  if (!target || target === e.target) return;
  target.focus();
  // In Auswahllisten folgt die Auswahl dem Fokus.
  if (all.some((el) => el.getAttribute("aria-current") === "true")) target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

const installed = new WeakSet<Element>();

export const roving: Attachment<Item> = (node) => {
  node.dataset.roving = "";
  const list = node.closest(LIST);
  if (!list) return;
  if (!installed.has(list)) {
    installed.add(list);
    list.addEventListener("focusin", onFocusIn as EventListener);
    list.addEventListener("keydown", onKeyDown as EventListener);
  }
  schedule(list);
  return () => schedule(list);
};
