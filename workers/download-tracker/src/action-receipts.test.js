import test from "node:test";
import assert from "node:assert/strict";
import {
  oneSentence,
  sanitizeMeta,
  shouldMint,
  appendActionReceipt,
  verifyActionChain,
  listReceipts,
  getReceipt,
  handleReceipts,
  isReceiptsPath,
  RECEIPTS_SPEC,
  ZERO,
} from "./action-receipts.js";

test("one sentence clips to first sentence", () => {
  assert.equal(oneSentence("Mint a receipt. Then publish."), "Mint a receipt.");
});

test("sanitizeMeta drops user and location keys", () => {
  const clean = sanitizeMeta({
    user: "nope",
    email: "a@b.c",
    lat: "39.7",
    location: "home",
    surface: "runtime",
    path: "/runtime/v1/fraggate/call",
    tool: "chainlock_append",
  });
  assert.equal(clean.user, undefined);
  assert.equal(clean.lat, undefined);
  assert.equal(clean.surface, "runtime");
  assert.equal(clean.tool, "chainlock_append");
});

test("shouldMint covers runtime and search, skips receipts tab", () => {
  assert.equal(shouldMint("POST", "/runtime/mcp"), true);
  assert.equal(shouldMint("GET", "/v1/search"), true);
  assert.equal(shouldMint("GET", "/receipts"), false);
  assert.equal(shouldMint("GET", "/"), false);
});

test("append-only hash chain verifies", async () => {
  globalThis.__AZ_ACTION_RECEIPTS = [];
  const a = await appendActionReceipt(null, {
    action: "Ask the runtime to stamp an act.",
    output: "Stamp appended on the public action chain.",
    surface: "aziel-runtime",
    path: "/runtime/mcp",
    method: "POST",
    tool: "chainlock_append",
    metadata: { user: "drop-me", event: "act" },
  });
  assert.equal(a.ok, true);
  assert.equal(a.receipt.previous_hash, ZERO);
  assert.equal(a.receipt.metadata.user, undefined);
  assert.match(a.receipt.id, /^AZACT-/);
  const b = await appendActionReceipt(null, {
    action: "Open the receipts tab.",
    output: "Tab lists the prior stamp and the new tip.",
    surface: "aziel-corpus",
    path: "/receipts",
    method: "GET",
  });
  assert.equal(b.receipt.previous_hash, a.receipt.hash);
  const v = await verifyActionChain(null);
  assert.equal(v.ok, true);
  assert.equal(v.entries, 2);
  assert.equal(v.spec, RECEIPTS_SPEC);
  const listed = await listReceipts(null, 10);
  assert.equal(listed[0].entry_hash, b.receipt.hash);
  const got = await getReceipt(null, a.receipt.hash);
  assert.equal(got.action, a.receipt.action);
});

test("receipts paths and gated append", async () => {
  assert.equal(isReceiptsPath("/receipts"), true);
  assert.equal(isReceiptsPath("/v1/receipts/append"), true);
  const denied = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/v1/receipts", { method: "POST", body: "{}" }), {});
  assert.equal(denied.status, 401);
});
