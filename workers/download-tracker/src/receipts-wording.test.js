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

test("served rows say append_only:true, not immutable:true (never_delete kept)", () => {
  for (const f of ["media.js", "record-metadata.js", "ledger.js", "review.js", "review-store.js"]) {
    const src = readFileSync(new URL("./" + f, import.meta.url), "utf8");
    assert.doesNotMatch(src, /immutable:\s*true/, f);
    assert.match(src, /append_only:\s*true/, f);
  }
  for (const f of ["review.js", "review-store.js"]) {
    assert.match(readFileSync(new URL("./" + f, import.meta.url), "utf8"), /never_delete:\s*true/, f);
  }
});
