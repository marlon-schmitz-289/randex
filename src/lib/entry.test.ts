import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPatch, patchEntry } from "./entry.ts";
import type { Run } from "./types.ts";

test("applyPatch setzt Felder, undefined entfernt sie", () => {
  const t: { a?: number; b?: string; c?: boolean } = { a: 1, b: "x" };
  applyPatch(t, { a: 2, b: undefined, c: true });
  assert.deepEqual(t, { a: 2, c: true });
});

test("patchEntry legt an, ergänzt und entfernt leere Einträge", () => {
  const p: Run["pokemon"] = {};
  patchEntry(p, 25, { note: "n" });
  patchEntry(p, 25, { types: ["electric"] });
  assert.deepEqual(p, { 25: { note: "n", types: ["electric"] } });
  patchEntry(p, 25, { note: undefined, types: undefined });
  assert.deepEqual(p, {});
  patchEntry(p, 1, { note: undefined });
  assert.deepEqual(p, {});
});
