import test from "node:test";
import assert from "node:assert/strict";
import { handleReceipts } from "./action-receipts.js";
import { AGGREGATE_SITES, aggregateCatalog, fileAggregateReceipt, listFiledReceipts } from "./receipt-aggregate.js";

function memoryKv() {
  const map = new Map();
  return {
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async put(key, value) { map.set(key, String(value)); },
  };
}

test("the receipts subtree names the source hubs and files no invented rows", async () => {
  const catalog = aggregateCatalog();
  assert.equal(catalog.label, "receipts");
  assert.equal(catalog.live, false);
  assert.equal(catalog.decryption_complete, false);
  assert.equal(catalog.cap7_is_icann, false);
  assert.equal(catalog.paid_sat, "HELD");
  assert.equal(catalog.tiebreak, "refused");
  const slugs = catalog.sites.map((site) => site.slug);
  assert.deepEqual(slugs, ["godlock", "aziel-runtime", "unseal", "ae", "hdj", "corpus"]);
  for (const site of catalog.sites) assert.equal(site.payload, null);
  assert.equal(AGGREGATE_SITES.length, slugs.length);

  const home = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/receipts"), {});
  const html = await home.text();
  assert.match(html, /<h1>Receipts<\/h1>/);
  assert.match(html, /href="\/receipts\/sites\/godlock">godlock\.uk</);
  assert.match(html, /href="\/receipts\/sites\/unseal">TimeToUnsealTheBook</);
  assert.match(html, /href="\/receipts\/sites\/hdj">hedidntjump\.com</);
  assert.match(html, /does not invent/);
  assert.doesNotMatch(html, /cracked|solved/);

  const index = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/receipts/sites"), {});
  assert.match(await index.text(), /<h1>receipts<\/h1>/);
  const folder = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/receipts/sites/godlock"), { DOWNLOADS: memoryKv() });
  assert.equal(folder.status, 200);
  assert.match(await folder.text(), /No receipts filed from this site/);

  const missing = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/v1/receipts/sites/nope"), {});
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).code, "AGGREGATE-SITE");

  const machine = await handleReceipts(new Request("https://www.azielcorpuslibrary.net/v1/receipts/sites"), {});
  const doc = await machine.json();
  assert.equal(doc.live, false);
  assert.equal(doc.decryption_complete, false);
  assert.equal(doc.paid_sat, "HELD");
});

test("filing stores the hash under one site and refuses a second site", async () => {
  const env = { DOWNLOADS: memoryKv() };
  const hash = "ab".repeat(32);
  const filed = await fileAggregateReceipt(env, { site: "godlock", entry_hash: hash });
  assert.equal(filed.ok, true);
  assert.equal(filed.record.decryption_complete, false);
  assert.equal(filed.record.live, false);
  assert.equal(filed.record.paid_sat, "HELD");
  assert.equal(filed.record.cap7_is_icann, false);
  const again = await fileAggregateReceipt(env, { site: "godlock", entry_hash: hash });
  assert.equal(again.already, true);
  const clash = await fileAggregateReceipt(env, { site: "hdj", entry_hash: hash });
  assert.equal(clash.ok, false);
  assert.equal(clash.code, "LATTICE-TIEBREAK-CORPUS");
  const listed = await listFiledReceipts(env, "godlock");
  assert.equal(listed.receipts.length, 1);
  assert.equal(listed.receipts[0].entry_hash, hash);
  const down = await listFiledReceipts({}, "godlock");
  assert.equal(down.ok, false);
  assert.equal(down.code, "AGGREGATE-STORE-UNAVAILABLE");
  assert.deepEqual(down.receipts, []);
});
