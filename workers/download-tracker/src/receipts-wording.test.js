import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { receiptsDataset } from "./action-receipts.js";

test("receipts dataset says hash-linked, append-only, not immutable", () => {
  const d = receiptsDataset({});
  assert.match(d.description, /^Hash-linked, append-only public action receipts/);
  assert.doesNotMatch(JSON.stringify(d), /immutable/i);
});

test("receipt page and receipts module do not claim immutability in prose", () => {
  for (const f of ["action-receipts.js", "hosted-pages.js"]) {
    const src = readFileSync(new URL("./" + f, import.meta.url), "utf8");
    assert.doesNotMatch(src, /Immutable (public action receipts|hash-chained entry)/, f);
  }
});
