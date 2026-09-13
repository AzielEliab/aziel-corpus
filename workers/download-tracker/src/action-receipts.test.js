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
  isReceiptsTabPath,
  RECEIPTS_SPEC,
  ZERO,
} from "./action-receipts.js";
import { page, homeBody } from "./ui.js";

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
  assert.equal(isReceiptsTabPath("/receipts"), true);
  assert.equal(isReceiptsTabPath("/receipts.jsonl"), true);
  assert.equal(isReceiptsTabPath("/v1/receipts"), false);
  assert.equal(isReceiptsPath("/receipt/AZDOC-1"), false);
  const denied = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/v1/receipts", { method: "POST", body: "{}" }), {});
  assert.equal(denied.status, 401);
});

test("GET /receipts is a human tab with four fields, Dataset, and sister links", async () => {
  globalThis.__AZ_ACTION_RECEIPTS = [];
  globalThis.__AZ_ACTION_ISOLATED = [];
  await appendActionReceipt(null, {
    action: "Mint the public action receipt.",
    output: "Chain tip moved one row.",
    surface: "aziel-corpus",
    path: "/v1/search",
    method: "GET",
    tool: "search",
    metadata: { email: "drop@x", ip: "1.2.3.4" },
  });
  const res = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/receipts"), {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<h1>Receipts<\/h1>/);
  assert.match(html, /href="\/receipts">Receipts</);
  assert.match(html, /ACT-RECEIPT-1\.0/);
  assert.match(html, /Mint the public action receipt\./);
  assert.match(html, /Chain tip moved one row\./);
  assert.match(html, /previous_hash/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type":"Dataset"/);
  assert.match(html, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(html, /https:\/\/www\.azieleliab\.com\/receipts/);
  assert.match(html, /https:\/\/godlock\.uk\/receipts/);
  assert.match(html, /https:\/\/www\.hedidntjump\.com\/receipts/);
  assert.doesNotMatch(html, /drop@x/);
  assert.doesNotMatch(html, /1\.2\.3\.4/);
});

test("verify is fail-closed and broken prev isolates", async () => {
  globalThis.__AZ_ACTION_RECEIPTS = [];
  globalThis.__AZ_ACTION_ISOLATED = [];
  const a = await appendActionReceipt(null, {
    action: "Keep the chain honest.",
    output: "First row is genesis.",
    surface: "aziel-corpus",
    path: "/v1/search",
    method: "GET",
  });
  const broken = await appendActionReceipt(null, {
    action: "Force a broken previous_hash.",
    output: "Row is isolated off the tip.",
    previous_hash: ZERO,
    surface: "aziel-corpus",
    path: "/v1/search",
    method: "GET",
  });
  assert.equal(broken.isolated, true);
  assert.equal(broken.receipt.previous_hash, ZERO);
  const listed = await listReceipts(null, 10);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].hash, a.receipt.hash);
  const ok = await verifyActionChain(null);
  assert.equal(ok.ok, true);
  assert.equal(ok.entries, 1);
  globalThis.__AZ_ACTION_RECEIPTS = [{
    id: "AZACT-dead",
    hash: "deadbeef",
    entry_hash: "deadbeef",
    previous_hash: ZERO,
    action: "Tamper the stored hash.",
    output: "Verify must fail closed.",
    metadata: { spec: RECEIPTS_SPEC, runtime_version: "2.7.0" },
  }];
  const failed = await verifyActionChain(null);
  assert.equal(failed.ok, false);
  const verifyRes = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/receipts/verify", {
    headers: { Accept: "application/json" },
  }), {});
  assert.equal(verifyRes.status, 409);
});

test("receipts nav does not regress homepage Title*", () => {
  const home = page("Corpus Search", homeBody({ rows: [], host: "https://www.azielcorpuslibrary.net" }), { path: "/", kind: "search" });
  assert.match(home, /href="\/receipts">Receipts</);
  assert.match(home, /<label class="field-label" for="anon-title">Title <span class="req" aria-hidden="true">\*<\/span><\/label>/);
  assert.match(home, /<h1>Search the libraries<\/h1>/);
});
