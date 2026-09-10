import test from "node:test";
import assert from "node:assert/strict";
import {
  LIBRARY_INDEX_KEY,
  KV_CACHE_TTL,
  collectStats,
  createKvBudget,
  emptyPackedIndex,
  readPackedIndex,
  refreshPackedIndex,
  searchPackedRecords,
  sealPackedIndex,
  writePackedIndex,
  cardFromRecord,
  libraryHealthFields,
} from "./library-index.js";
import { handleRuntimeApi } from "./runtime.js";
import { RUNTIME_USES_INDEX, recordRuntimeUse, runtimeUsesPayload } from "./runtime-uses.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|10\.5281\/zenodo/i;

function throwingListKv(store = new Map()) {
  const calls = { get: [], put: [], list: 0 };
  return {
    calls,
    store,
    async get(key, opts) {
      calls.get.push({ key, opts });
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      calls.put.push(key);
      store.set(key, String(value));
    },
    async list() {
      calls.list += 1;
      throw new Error("KV.list forbidden on hot path");
    },
  };
}

function memoryCache() {
  const store = new Map();
  return {
    store,
    async match(req) {
      const url = typeof req === "string" ? req : req.url;
      const hit = store.get(url);
      return hit ? new Response(hit, { headers: { "Content-Type": "application/json" } }) : undefined;
    },
    async put(req, res) {
      const url = typeof req === "string" ? req : req.url;
      store.set(url, await res.text());
    },
  };
}

test("hot-path collectStats is one packed get and never KV.list", async () => {
  const packed = sealPackedIndex({
    views: 12,
    downloads: 4,
    records: [{ record_id: "AZDOC-1", title: "Shelf card", library: "aziel", content_sha256: "abc", href: "/record/AZDOC-1" }],
  });
  const kv = throwingListKv(new Map([[LIBRARY_INDEX_KEY, JSON.stringify(packed)]]));
  const cache = memoryCache();
  const stats = await collectStats({ DOWNLOADS: kv }, { cache });
  assert.equal(kv.calls.list, 0);
  assert.equal(kv.calls.get.length, 1);
  assert.equal(kv.calls.get[0].key, LIBRARY_INDEX_KEY);
  assert.equal(kv.calls.get[0].opts.cacheTtl, KV_CACHE_TTL);
  assert.equal(stats.views, 12);
  assert.equal(stats.downloads, 4);
  assert.equal(stats.kv_list_hot_path, false);
  assert.match(stats.index_sha256, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(stats), BANNED);

  const again = await collectStats({ DOWNLOADS: kv }, { cache });
  assert.equal(kv.calls.get.length, 1, "second read should hit Cache API, not KV");
  assert.equal(again.views, 12);
  assert.equal(kv.calls.list, 0);
});

test("readPackedIndex missing key returns empty shelf without listing", async () => {
  const kv = throwingListKv();
  const doc = await readPackedIndex({ DOWNLOADS: kv }, { cache: memoryCache() });
  assert.equal(kv.calls.list, 0);
  assert.equal(doc.key, LIBRARY_INDEX_KEY);
  assert.equal(doc.records.length, 0);
  assert.equal(doc.kv_list_hot_path, false);
  assert.equal(doc.author, "Aziel Eliab");
});

test("createKvBudget refuses list on the hot path", async () => {
  const kv = throwingListKv();
  const budget = createKvBudget(kv, { allowList: false });
  await assert.rejects(() => budget.list({}), /not allowed on the library hot path/);
  assert.equal(budget.stats.lists, 1);
});

test("refreshPackedIndex loads D1 cards and writes library:index:v1 without list", async () => {
  const kv = throwingListKv();
  const rows = [
    { record_id: "AZDOC-A", title: "Paper", author: "Aziel Eliab", library: "aziel", content_sha256: "aa", chain_tip: "tip", created_utc: "2026-09-01T00:00:00Z" },
  ];
  const env = {
    DOWNLOADS: kv,
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async all() { return { results: rows }; },
        };
      },
    },
  };
  const doc = await refreshPackedIndex(env, { cache: memoryCache() });
  assert.equal(kv.calls.list, 0);
  assert.ok(kv.store.has(LIBRARY_INDEX_KEY));
  assert.equal(doc.records[0].record_id, "AZDOC-A");
  assert.equal(doc.records[0].href, "/record/AZDOC-A");
  assert.equal(doc.records[0].author, "Aziel Eliab");
  assert.ok(!("body" in doc.records[0]));
});

test("searchPackedRecords filters the packed shelf without KV", () => {
  const doc = emptyPackedIndex({
    records: [
      cardFromRecord({ record_id: "AZDOC-1", title: "Florence notes", library: "corpus", author: "Aziel Eliab", domain: "library", created_utc: "2026-01-02" }),
      cardFromRecord({ record_id: "AZDOC-2", title: "Other", library: "aziel", author: "Aziel Eliab", created_utc: "2026-01-01" }),
    ],
  });
  const hits = searchPackedRecords(doc, { q: "Florence", library: "all", limit: 10 });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].record_id, "AZDOC-1");
});

test("GET /v1/health is failover-ready standby and does not list KV", async () => {
  const packed = sealPackedIndex({ views: 1, downloads: 2, records: [] });
  const kv = throwingListKv(new Map([[LIBRARY_INDEX_KEY, JSON.stringify(packed)]]));
  const res = await handleRuntimeApi(
    new Request("https://www.azielcorpuslibrary.net/v1/health"),
    new URL("https://www.azielcorpuslibrary.net/v1/health"),
    { DOWNLOADS: kv }
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.role, "standby");
  assert.equal(body.topology, "tunnel-primary");
  assert.equal(body.failover_ready, true);
  assert.equal(body.index_key, LIBRARY_INDEX_KEY);
  assert.equal(body.kv_list_hot_path, false);
  assert.equal(body.author, "Aziel Eliab");
  assert.match(body.note, /Not a VPN/);
  assert.equal(kv.calls.list, 0);
  assert.doesNotMatch(JSON.stringify(body), BANNED);
});

test("GET /v1/library-index is the packed key and never lists", async () => {
  const packed = sealPackedIndex({
    records: [cardFromRecord({ record_id: "AZDOC-9", title: "Card", library: "aziel", author: "Aziel Eliab" })],
  });
  const kv = throwingListKv(new Map([[LIBRARY_INDEX_KEY, JSON.stringify(packed)]]));
  const res = await handleRuntimeApi(
    new Request("https://www.azielcorpuslibrary.net/v1/library-index"),
    new URL("https://www.azielcorpuslibrary.net/v1/library-index"),
    { DOWNLOADS: kv }
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") || "", /s-maxage=300/);
  const body = await res.json();
  assert.equal(body.key, LIBRARY_INDEX_KEY);
  assert.equal(body.records[0].record_id, "AZDOC-9");
  assert.equal(kv.calls.list, 0);
});

test("runtime uses hot path reads packed index and never KV.list", async () => {
  const kv = throwingListKv();
  await recordRuntimeUse({ DOWNLOADS: kv }, { method: "GET", path: "/runtime/v1/fraggate/list" });
  assert.ok(kv.store.has(RUNTIME_USES_INDEX));
  const payload = await runtimeUsesPayload({ DOWNLOADS: kv, AZIEL_RUNTIME: { fetch: async () => { throw new Error("no origin"); } } });
  assert.equal(payload.uses, 1);
  assert.equal(payload.by_path["/runtime/v1/fraggate/list"], 1);
  assert.equal(kv.calls.list, 0);
});

test("libraryHealthFields stay Aziel Eliab only", () => {
  const fields = libraryHealthFields(emptyPackedIndex(), {});
  assert.equal(fields.role, "standby");
  assert.match(fields.note, /Aziel Eliab/);
  assert.doesNotMatch(fields.note, BANNED);
});

test("writePackedIndex then collectStats still never lists", async () => {
  const kv = throwingListKv();
  await writePackedIndex({ DOWNLOADS: kv }, { views: 3, downloads: 1, records: [] }, { cache: memoryCache() });
  const stats = await collectStats({ DOWNLOADS: kv }, { cache: memoryCache() });
  assert.equal(stats.views, 3);
  assert.equal(kv.calls.list, 0);
});
