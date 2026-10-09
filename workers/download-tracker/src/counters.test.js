import test from "node:test";
import assert from "node:assert/strict";
import { bumpCounters, readCounters, listD1DimCounters } from "./counters.js";
import { isQuotaError, isTransientOverload, quotaResponse, TRANSIENT_RETRY_AFTER_S } from "./quota.js";
import {
  LIBRARY_INDEX_KEY,
  normalizePackedIndex,
  readPackedIndex,
  refreshPackedIndex,
  sealPackedIndex,
  statsFromPacked,
  needsRevalidate,
  COUNTS_REFRESH_S,
} from "./library-index.js";
import { visibleTagEntries } from "./visible-tags.js";
import worker from "./index.js";

const HOST = "https://www.azielcorpuslibrary.net";
const D1_DAILY = "D1_ERROR: Your account has exceeded D1's free tier daily row write limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.";
const KV_DAILY = "KV put() limit exceeded for the day.";

function memoryKv(seed = {}, { putError, getError } = {}) {
  const store = new Map(Object.entries(seed));
  const puts = [];
  return {
    store, puts,
    async get(k) { if (getError) throw new Error(getError); return store.has(k) ? store.get(k) : null; },
    async put(k, v) { if (putError) throw new Error(putError); puts.push(k); store.set(k, String(v)); },
    async list() { throw new Error("no list"); },
  };
}

/** Tiny D1 fake: hit_counters upsert/select + a records shelf. */
function fakeD1({ records = [], error, noTable = false } = {}) {
  const counters = new Map();
  let tableExists = !noTable;
  const calls = { upserts: 0, creates: 0 };
  function stmt(sql) {
    let args = [];
    const run = async () => {
      if (error) throw new Error(error);
      if (/CREATE TABLE IF NOT EXISTS hit_counters/i.test(sql)) { tableExists = true; calls.creates += 1; return {}; }
      if (/INSERT INTO hit_counters/i.test(sql)) {
        if (!tableExists) throw new Error("D1_ERROR: no such table: hit_counters");
        calls.upserts += 1;
        counters.set(args[0], (counters.get(args[0]) || 0) + 1);
        return {};
      }
      return {};
    };
    return {
      bind(...a) { args = a; return this; },
      run,
      async all() {
        if (error) throw new Error(error);
        if (/FROM hit_counters WHERE key IN/i.test(sql)) {
          if (!tableExists) throw new Error("D1_ERROR: no such table: hit_counters");
          return { results: args.filter((k) => counters.has(k)).map((k) => ({ key: k, n: counters.get(k) })) };
        }
        if (/FROM hit_counters WHERE key LIKE/i.test(sql)) {
          if (!tableExists) throw new Error("D1_ERROR: no such table: hit_counters");
          const prefix = String(args[0]).replace(/%$/, "");
          return { results: [...counters].filter(([k]) => k.startsWith(prefix)).map(([key, n]) => ({ key, n })) };
        }
        if (/FROM records/i.test(sql)) return { results: records };
        return { results: [] };
      },
      async first() { const r = await this.all(); return (r.results || [])[0] || null; },
    };
  }
  return {
    counters, calls,
    prepare: (sql) => stmt(sql),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
}

test("hits go to one D1 upsert per key, with no KV put; exact total = legacy KV + D1", async () => {
  const kv = memoryKv({ "aziel-corpus|__views__": "100" });
  const db = fakeD1();
  const env = { DOWNLOADS: kv, DB: db };
  for (let i = 0; i < 3; i++) assert.equal((await bumpCounters(env, ["aziel-corpus|__views__"])).store, "d1");
  assert.equal(kv.puts.length, 0, "no KV put per hit");
  const c = await readCounters(env, ["aziel-corpus|__views__"]);
  assert.equal(c["aziel-corpus|__views__"], 103);
});

test("missing hit_counters table is created once, then the hit counts", async () => {
  const db = fakeD1({ noTable: true });
  const res = await bumpCounters({ DOWNLOADS: memoryKv(), DB: db }, ["k1"]);
  assert.equal(res.store, "d1");
  assert.equal(db.calls.creates, 1);
  assert.equal(db.counters.get("k1"), 1);
});

test("D1 down: hit falls back to KV; both down: store none + quota flag, never throws", async () => {
  const kv = memoryKv();
  const res = await bumpCounters({ DOWNLOADS: kv, DB: fakeD1({ error: D1_DAILY }) }, ["k"]);
  assert.equal(res.store, "kv");
  assert.equal(kv.store.get("k"), "1");
  const none = await bumpCounters({ DOWNLOADS: memoryKv({}, { putError: KV_DAILY }), DB: fakeD1({ error: D1_DAILY }) }, ["k"]);
  assert.equal(none.store, "none");
  assert.equal(none.quota, true);
});

test("readCounters propagates a D1 daily-limit error (never publish a low count)", async () => {
  await assert.rejects(() => readCounters({ DOWNLOADS: memoryKv(), DB: fakeD1({ error: D1_DAILY }) }, ["k"]), (e) => isQuotaError(e));
});

test("homepage views: bot view = 1 D1 upsert (total only), human = 2, zero KV puts", async () => {
  const kv = memoryKv();
  const db = fakeD1();
  const env = { DOWNLOADS: kv, DB: db };
  await worker.fetch(new Request(HOST + "/", { headers: { "User-Agent": "curl/8.0 health-check" } }), env, {});
  await worker.fetch(new Request(HOST + "/", { headers: { "User-Agent": "Mozilla/5.0" } }), env, { waitUntil() {} });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(kv.puts.filter((k) => k.includes("__views")).length, 0);
  assert.ok(db.counters.get("aziel-corpus|__views__") >= 1);
});

test("downloads: no packed-index rewrite per download; cron folds totals and per-repo breakdown", async () => {
  const kv = memoryKv({ "aziel-corpus|__total__": "10", "aziel-corpus|AzielEliab|aziel-corpus|main|0": "10" });
  const db = fakeD1({ records: [{ record_id: "AZDOC-D1", title: "D1", library: "aziel" }] });
  const env = { DOWNLOADS: kv, DB: db };
  for (let i = 0; i < 2; i++) {
    const res = await worker.fetch(new Request(HOST + "/event", {
      method: "POST",
      headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/json" },
      body: JSON.stringify({ owner: "AzielEliab", repo: "aziel-corpus", branch: "main" }),
    }), env, {});
    const body = await res.json();
    assert.equal(body.counted, true);
    assert.equal(body.count, 11 + i, "exact live total in /event response");
  }
  assert.equal(kv.puts.length, 0, "no KV put and no library:index:v1 rewrite per download");
  const packed = await refreshPackedIndex(env);
  assert.equal(packed.downloads, 12);
  assert.equal(packed.downloads_human, 2);
  assert.equal(packed.by_repo["AzielEliab/aziel-corpus"], 12);
  const stats = statsFromPacked(packed);
  assert.equal(stats.counts_refresh_s, COUNTS_REFRESH_S);
  assert.match(stats.counts_note, /up to counts_refresh_s/);
  assert.equal(stats.counts_as_of, packed.ts);
});

test("a download is served even when both counter stores are over quota, labelled X-Aziel-Count", async () => {
  const env = {
    DOWNLOADS: memoryKv({}, { putError: KV_DAILY }),
    DB: fakeD1({ error: D1_DAILY }),
    ASSETS: { async fetch() { return new Response("zipbytes", { status: 200, headers: { "Content-Length": "8" } }); } },
  };
  const res = await worker.fetch(new Request(HOST + "/download", { headers: { "User-Agent": "Mozilla/5.0" } }), env, {});
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "zipbytes");
  assert.equal(res.headers.get("X-Aziel-Count"), "skipped-quota");
});

test("isQuotaError is daily-limit only; short overloads get a 30 s Retry-After", () => {
  assert.equal(isQuotaError(new Error(D1_DAILY)), true);
  assert.equal(isQuotaError(new Error(KV_DAILY)), true);
  for (const m of ["quota", "Too many requests", "KV PUT failed: 429 Too Many Requests", "D1_ERROR: D1 DB is overloaded. Too many requests queued."]) {
    assert.equal(isQuotaError(new Error(m)), false, m);
  }
  assert.equal(isTransientOverload(new Error("KV PUT failed: 429 Too Many Requests")), true);
  assert.equal(isTransientOverload(new Error("D1_ERROR: D1 DB is overloaded. Too many requests queued.")), true);
  assert.equal(isTransientOverload(new Error(D1_DAILY)), false);
  const res = quotaResponse(new Error("Too many requests"));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Retry-After"), String(TRANSIENT_RETRY_AFTER_S));
});

test("transient overload on a route answers 503 with a short Retry-After", async () => {
  const env = { DOWNLOADS: memoryKv({}, { getError: "KV GET failed: 429 Too Many Requests" }) };
  const res = await worker.fetch(new Request(HOST + "/v1/stats"), env, {});
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Retry-After"), "30");
});

test("reads do not re-hash the packed index (CPU 1102): stored index_sha256 is kept", async () => {
  const sealed = sealPackedIndex({ records: [{ record_id: "AZDOC-H1", title: "H1" }] });
  const stored = { ...sealed, index_sha256: "stored-at-write" };
  assert.equal(normalizePackedIndex(stored).index_sha256, "stored-at-write");
  const doc = await readPackedIndex({ DOWNLOADS: memoryKv({ [LIBRARY_INDEX_KEY]: JSON.stringify(stored) }) });
  assert.equal(doc.index_sha256, "stored-at-write");
  assert.equal(statsFromPacked(doc).index_sha256, "stored-at-write");
  const unsealed = normalizePackedIndex({ records: [] });
  assert.ok(unsealed.index_sha256, "an index with no hash is still sealed once");
});

test("cached HTML re-renders at most once per 10 min, not on every hit", () => {
  assert.equal(needsRevalidate({ text: "x", ageMs: 1000 }), false);
  assert.equal(needsRevalidate({ text: "x", ageMs: 11 * 60 * 1000 }), true);
  assert.equal(needsRevalidate({ text: "x", ageMs: Infinity }), true);
  assert.equal(needsRevalidate(null), true);
});

test("visibleTagEntries memo returns equal, independent results", () => {
  const a = visibleTagEntries("History; Florence; Renaissance");
  const b = visibleTagEntries("History; Florence; Renaissance");
  assert.deepEqual(a, b);
  a[0].label = "mutated";
  assert.notEqual(visibleTagEntries("History; Florence; Renaissance")[0].label, "mutated");
});

test("listD1DimCounters skips reserved __ keys", async () => {
  const db = fakeD1();
  const env = { DB: db, DOWNLOADS: memoryKv() };
  await bumpCounters(env, ["aziel-corpus|__total__", "aziel-corpus|A|b|main|0"]);
  const rows = await listD1DimCounters(env, "aziel-corpus");
  assert.deepEqual(rows.map((r) => r.key), ["aziel-corpus|A|b|main|0"]);
});
