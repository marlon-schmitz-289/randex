import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, slotCount } from "./generate-data.mjs";

const SPECIAL_KEY = "\0special";

test("parseCsv: Quotes, Newline in Zelle, CRLF, ohne Schlusszeilenumbruch", () => {
  const text = 'id,name\r\n1,"a ""b"", c"\r\n2,"x\ny"\n3,';
  assert.deepEqual(parseCsv(text), [
    { id: "1", name: 'a "b", c' },
    { id: "2", name: "x\ny" },
    { id: "3", name: "" },
  ]);
});

test("parseCsv: Leerzeile am Ende ignoriert, falsche Spaltenzahl wirft", () => {
  assert.deepEqual(parseCsv("id,name\n1,a\n\n"), [{ id: "1", name: "a" }]);
  assert.throws(() => parseCsv("id,name\n1,a,b\n"));
});

test("slotCount: Tageszeiten als Maximum, Sonderbedingungen zählen nicht", () => {
  // HGSS Route 29 Gras: Rattfratz immer, tags Taubsi+Wiesor, nachts Hornliu, Radio nur als Sonderbedingung
  const r29 = new Map([
    ["", new Set([19])],
    ["time-day", new Set([16, 161])],
    ["time-morning", new Set([16, 161])],
    ["time-night", new Set([163, 19])],
    [SPECIAL_KEY, new Set([311, 312, 403])],
  ]);
  assert.equal(slotCount(r29), 3);
  assert.equal(slotCount(new Map([["", new Set([1, 2])]])), 2);
  assert.equal(slotCount(new Map([[SPECIAL_KEY, new Set([1])]])), 0);
});
